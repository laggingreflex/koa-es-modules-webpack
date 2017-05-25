const fs = require('fs');
const Koa = require('koa');
const esWebpack = require('koa-es-modules-webpack');

const app = new Koa();

app.use(esWebpack({
  root: __dirname + '/client',
}));

const html = fs.readFileSync(__dirname + '/client/index.html', 'utf8');
app.use(async ctx => ctx.body = html);

app.listen(3000, () => console.log('Listening on 3000'));
