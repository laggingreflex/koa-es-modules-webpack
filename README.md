# koa-es-modules-webpack

Koa middleware to serve ES6 Modules of requested js files on-the-fly using Webpack bundler



## Install

```sh
npm i koa-es-modules-webpack
```

## Usage

Checkout the [example](example)

### API

```
app.use(esWebpack(opts))
```

* **`root`** `[string](required)` Root directly to serve and resolve JS assets from
* **`cacheDir`** `[string](default:<root>/.webpack-cache)` Dir to put generated bundles
* **`watch`** `[boolean](default:false)` Watches requested modules for subsequent file-changes
* **`webpackConfig`** `[object]` Custom webpackConfig to use


