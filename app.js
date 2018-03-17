const excelParse = require('convert-excel-to-json');
const {readdirSync} = require('fs');
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

const logReThrow = R.curry((customMessage, error)=> {
    console.error(error.message, error);
    throw new Error(customMessage);
});

const endsWith = R.curry((searchStr, str) => str.endsWith(searchStr));
const fileContents = readdirSync('xls')
.filter(R.either(endsWith('.xls'), endsWith('.xlsx')))
.map(R.split('.'));

const roundProp = R.curry((prop, round, obj) => R.pipe(
    R.prop(prop), 
    R.tryCatch(roundTo(R.__, round), R.always('n/a'))
)(obj));

const renamedProps = {
    Ticker: R.prop('B'),
    Company: R.prop('C'),
    Streak: R.prop('D'),
    Sector: R.prop('BG'),
    Yield: roundProp('F', 2),
    '1-yr': roundProp('I', 1),
    '3-yr': roundProp('J', 1),
    '5-yr': roundProp('K', 1),
    '10-yr': roundProp('L', 1),
    'TTM EPS': roundProp('AE', 2)
};

const wantedTitles = ['B', 'C', 'D', 'BG', 'F', 'I', 'J', 'K', 'L', 'AE'];
const selectedTitle = R.pipe(
    R.prop('Canadian Dividend All-Star List'),
    R.filter(R.propIs(Number, 'A')),
    R.map(R.pick(wantedTitles)),
    R.map(R.applySpec(renamedProps))
);

const parseExcel = R.pipe(
    R.prop('query'),
    R.props(['fileName', 'extension']),
    R.join('.'),
    R.partial(resolve, [__dirname, 'xls']),
    R.objOf('sourceFile'),
    R.tryCatch(excelParse, logReThrow('Could not load file.')),
    R.tryCatch(selectedTitle, logReThrow('The excel sheet selected is not valid. The column/spreadsheet may have changed.'))
);

app.get('/', (req, res) => {
    res.render('index', {files: fileContents});
});

app.get('/load', (req, res) => {
    try {
        res.render('table', {stocks: parseExcel(req)});
    } catch(e) {
        res.render('error', {errorMessage: e.message});
    }
})

app.get('/getStocks.json', (req, res) => {
    res.json(selectedTitle(result));
});

const server = app.listen(3000, () => {
    opener('http://localhost:3000/');
});
