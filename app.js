const R = require('ramda');
const excelParseThump = require('convert-excel-to-json');
const {readdirSync} = require('fs');
const {join, resolve} = require('path');
const express = require('express');
const ejs = require('ejs');
const roundTo = R.curry(require('round-to'));
const opener = require('opener');

const excelParse = R.memoizeWith(R.prop('sourceFile'), excelParseThump);

const app = express();
app.use(express.static(join(__dirname, 'public')));
app.use('/load', express.static('public'));

app.set('view engine', 'ejs');
app.set('views', resolve(__dirname, 'views'));

const invalidError = 'The excel sheet selected is not valid. The column/spreadsheet may have changed.'

const logReThrow = R.curry((customMessage, error)=> {
    console.error(error.message, error);
    throw new Error(customMessage);
});

const endsWith = R.curry((searchStr, str) => str.endsWith(searchStr));
const startsWith = R.curry((searchStr, str) => str.startsWith(searchStr));

const fileContents = readdirSync('xls')
.filter(R.either(endsWith('.xls'), endsWith('.xlsx')))
.map(R.split('.'));

const roundProp = R.curry((prop, round, obj) => R.pipe(
    R.prop(prop), 
    R.tryCatch(roundTo(R.__, round), R.always('n/a'))
)(obj));

const renamedPropsCanada = {
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

const renamedPropsUSA = {
    Ticker: R.prop('B'),
    Company: R.prop('A'),
    Streak: R.prop('D'),
    Sector: R.prop('C'),
    Yield: roundProp('I', 2),
    '1-yr': roundProp('AL', 1),
    '3-yr': roundProp('AM', 1),
    '5-yr': roundProp('AN', 1),
    '10-yr': roundProp('AO', 1),
    'TTM EPS': roundProp('W', 2)
}
//Keep it seperate as it might change one day
const getCanadaColumns = R.pipe(
    R.prop('Canadian Dividend All-Star List'),
    R.filter(R.propIs(Number, 'A')),
    R.map(R.applySpec(renamedPropsCanada))
);

const getUsaColumns = R.pipe(
    R.prop('Champions'),
    R.filter(R.propIs(Number, 'E')),
    R.map(R.applySpec(renamedPropsUSA))
);

const spreadsheetPred = R.curry((index, prop, obj) => R.pipe(
    R.nth(index),
    R.propSatisfies(R.tryCatch(startsWith('http'), R.F), prop)
)(obj));
const spreadsheetCanada = spreadsheetPred(1, 'A');
const spreadsheetUSA = spreadsheetPred(0, 'D');

const getCanadaSpreadsheets = R.pipe(
    R.pickBy(spreadsheetCanada),
    R.mapObjIndexed(R.filter(R.propIs(Number, 'A'))),
    R.mapObjIndexed(R.map(R.applySpec(renamedPropsCanada)))
);

const getUSASpreadsheets = R.pipe(
    R.pickBy(spreadsheetUSA),
    R.mapObjIndexed(R.filter(R.propIs(Number, 'E'))),
    R.mapObjIndexed(R.map(R.applySpec(renamedPropsUSA)))
);

const getCountryLogic = [
    [R.has('Canadian Dividend All-Star List'), getCanadaSpreadsheets],
    [R.has('Champions'), getUSASpreadsheets],
    [R.T, getCanadaSpreadsheets]
];

const redirectFirstSpreadsheet = R.pipe(
    R.keys,
    R.head,
    R.prepend('/load/'),
    R.join('')
);

const parseExcel = R.pipe(
    R.prop('query'),
    R.props(['fileName', 'extension']),
    R.join('.'),
    R.partial(resolve, [__dirname, 'xls']),
    R.objOf('sourceFile'),
    R.tryCatch(excelParse, logReThrow('Could not load file.')),
    R.tryCatch(R.cond(getCountryLogic), logReThrow(invalidError))
);

app.get('/', (req, res) => {
    res.render('index', {files: fileContents});
});

app.get('/load', (req, res, next) => {
    try {
        const spreadsheets = parseExcel(req);
        app.locals.spreadsheets = spreadsheets;
        res.redirect(redirectFirstSpreadsheet(spreadsheets));
    } catch(e) {
        next(e);
    }
})

app.get('/load/:spreadsheet', ({params: {spreadsheet}}, res, next) => {
    const pred = app.locals.spreadsheets[spreadsheet];
    if (pred) {
        app.locals.stocks = pred;
        res.render('table', {currentSpreadsheet: spreadsheet});
    } else {
        next(new Error(`The spreadsheet: ${spreadsheet} does not exist.`));
    }
});

app.use(({message}, req, res, next) => {
    res.status(500).render('error', {errorMessage: message});
});

const server = app.listen(3000, () => {
    opener('http://localhost:3000/');
});
