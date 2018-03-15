const excelParse = require('convert-excel-to-json');
const R = require('ramda');
const {join, resolve} = require('path');
const express = require('express');
const ejs = require('ejs');
const roundTo = R.curry(require('round-to'));
const opener = require('opener');

const app = express();

app.use(express.static(resolve(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', resolve(__dirname, 'views'));

const options = {
    sourceFile: join(__dirname, 'xls', 'canada.xls')
};

const result = excelParse(options);

const roundProp = R.curry((prop, round, obj) => R.pipe(
    R.prop(prop), 
    R.tryCatch(roundTo(R.__, round), R.always('n/a'))
)(obj));

const renamedProps = {
    Ticker: R.prop('B'),
    Company: R.prop('C'),
    Yield: roundProp('F', 2),
    '1-yr': roundProp('I', 1),
    '3-yr': roundProp('J', 1),
    '5-yr': roundProp('K', 1),
    '10-yr': roundProp('L', 1),
    'TTM EPS': roundProp('AE', 2)
};

const wantedTitles = ['B', 'C', 'F', 'I', 'J', 'K', 'L', 'AE'];
const selectedTitle = R.pipe(
    R.prop('Canadian Dividend All-Star List'),
    R.filter(R.propIs(Number, 'A')),
    R.map(R.pick(wantedTitles)),
    R.map(R.applySpec(renamedProps))
);

app.get('/', (req, res) => {
    res.render('index', {stocks: selectedTitle(result)});
    server.close();
});

app.get('/getStocks', (req, res) => {
    res.json(selectedTitle(result));
});

const server = app.listen(3000, () => {
    opener('http://localhost:3000/');
});
