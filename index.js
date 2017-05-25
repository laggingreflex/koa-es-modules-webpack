const Path = require('path');
const fs = require('fs-extra');
const webpack = require('webpack');
const debug = require('debug')('koa-es-modules-webpack');
// const debug = (...msg) => console.log('koa-es-modules-webpack', ...msg)

const mandate = reason => { throw new Error(reason) }

const cache = {};
const defaultWebpackConfig = {};

module.exports = ({
  root = mandate('Root is required'),
  cacheDir = Path.join(root, '.webpack-cache'),
  ext = ['js'],
  webpackConfig: webpackConfigArg = {},
  warn = false,
} = {}) => async(ctx, next) => {

  if (ctx.method !== 'GET') {
    debug('Not processing', ctx.path, 'method!=GET');
    return next();
  }

  if (ext.indexOf(ctx.path.substr(-2)) == -1) {
    debug('Not processing', ctx.path, 'ext!=' + ext);
    return next();
  }

  const path = Path.join(root, ctx.path);
  const cachePath = Path.join(cacheDir, ctx.path);

  if (cache[path]) {
    return ctx.body = cache[path];
  }

  try {
    return ctx.body = cache[path] = await fs.readFile(cachePath, 'utf8');
  } catch (err) {
    debug(`Couldn't load from cache`, cachePath, err.message);
  }

  try {
    await fs.access(path);
  } catch (err) {
    debug('Not processing', ctx.path, '!exists', path, err.message);
    return next();
  }

  debug('Processing', ctx.path, '=>', path);

  const webpackConfig = Object.assign({
    entry: path,
    output: {
      path: cacheDir,
      filename: ctx.path.substr(1),
    }
  }, defaultWebpackConfig, webpackConfigArg);

  let stats;
  try {
    stats = await new Promise((c, x) => webpack(webpackConfig, (webpackError, stats) => {
      if (webpackError) {
        return x(webpackError);
      }
      const info = stats.toJson();
      if (stats.hasErrors()) {
        return x(info.errors);
      }
      if (warn && stats.hasWarnings()) {
        console.warn(info.warnings);
      }
      c(stats);
    }))
  } catch (error) {
    console.error(error);
    return next(error);
  }

  debug('Bundle generated');

  try {
    debug('Responding with generated code');
    return ctx.body = cache[path] = await fs.readFile(cachePath, 'utf8');
  } catch (err) {
    debug(`Couldn't respond with webpack generated code`, cachePath, err.message);
    throw err;
  }
};
