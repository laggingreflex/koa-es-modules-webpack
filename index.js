const Path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');
const _debug = require('debug')('koa-es-modules-webpack');
// const _debug = (...msg) => console.log('koa-es-modules-webpack', ...msg)

const mandate = reason => { throw new Error(reason) }

const cache = {};
const watcherCache = {};
const defaultWebpackConfig = {};

module.exports = ({
  root = mandate('Root is required'),
  cacheDir = Path.join(root, '.webpack-cache'),
  ext = ['js'],
  webpackConfig: webpackConfigArg = {},
  warn = false,
  watch = false,
} = {}) => async(ctx, next) => {
  const debug = (...msg) => _debug(ctx.path, ...msg)

  if (ctx.method !== 'GET') {
    debug('Not processing', 'method!=GET');
    return next();
  }

  if (ext.indexOf(ctx.path.substr(-2)) == -1) {
    debug('Not processing', 'ext!=' + ext);
    return next();
  }

  const path = Path.join(root, ctx.path);
  const cachePath = Path.join(cacheDir, ctx.path);

  if (!watch || watcherCache[path]) {
    if (cache[path]) {
      debug('Serving from mem-cache');
      return ctx.body = cache[path];
    }

    try {
      ctx.body = cache[path] = await fs.readFile(cachePath, 'utf8');
      debug('Serving from file-cache');
      return;
    } catch (err) {
      // debug(`Couldn't load from file-cache`, cachePath, err.message);
    }
  }


  try {
    await fs.access(path);
  } catch (err) {
    debug('Not processing, !exists', path, err.message);
    return next();
  }

  debug('Processing', path);

  const webpackConfig = Object.assign({
    entry: path,
    output: {
      path: cacheDir,
      filename: ctx.path.substr(1),
    }
  }, defaultWebpackConfig, webpackConfigArg);

  const compiler = webpack(webpackConfig);

  const run = cb => new Promise((ok, x) => {
    let ret;
    const pcb = (...args) => cb(...args).then(() => ok(ret)).catch(x)
    ret = watch ? compiler.watch({}, pcb) : compiler.run(pcb);
  });
  let responded = false
  const respond = (err, data) => {
    if (err) {
      console.error(err);
      if (!responded) {
        responded = true;
        next(err);
      }
    } else if (responded) {
      debug('Already responded for this request');
    } else {
      debug('Responding with generated code');
      responded = true;
      ctx.body = data;
    }
  }
  watcherCache[path] = await run(async(err, stats) => {
    debug('Bundle generation triggered');
    try {
      if (err) {
        respond(err);
        return;
      }
      const info = stats.toJson();
      if (stats.hasErrors()) {
        respond(info.errors);
        return;
      }
      if (warn && stats.hasWarnings()) {
        console.warn(info.warnings);
      }
      cache[path] = await fs.readFile(cachePath, 'utf8');
      respond(null, cache[path]);
      debug('Bundle generated');
    } catch (error) {
      respond(err);
    }
  });
};
