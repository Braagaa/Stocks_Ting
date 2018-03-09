const excelParse = require('convert-excel-to-json');
const R = require('ramda');
const {join, resolve} = require('path');
const express = require('express');
const ejs = require('ejs');
const roundTo = R.curry(require('round-to'));

const app = express();

app.set('view engine', 'ejs');
app.set('views', resolve(__dirname, 'views'));

const options = {
    sourceFile: join(__dirname, 'xls', 'canada.xls')
};

const result = excelParse(options);

const yieldPred = R.pipe(
    R.prop('F'),
    R.both(R.gte(R.__, 2), R.lte(R.__, 4))
);
const dividenPred = R.pipe(
    R.props(['I', 'J', 'K', 'L']),
    R.any(R.both(R.gte(R.__, 5), R.lte(R.__, 20)))
);
const payoutRatioPred = R.pipe(R.prop('AE'), R.lte(R.__, 100));

const roundProp = R.curry((prop, round, obj) => R.pipe(
    R.prop(prop), 
    R.tryCatch(roundTo(R.__, round), R.always('n/a'))
)(obj));

const preds = {
    yieldPred,
    dividenPred,
    payoutRatioPred
};

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

const filterStocks = R.pipe(
    R.applySpec(preds), 
    R.values, 
    R.filter(R.equals(true)), 
    R.length, 
    R.gte(2)
);

const v1 = R.pipe(
    R.prop('Canadian Dividend All-Star List'),
    R.filter(R.propIs(Number, 'A')),
    R.filter(filterStocks),
    R.map(R.pick(['B', 'C', 'F', 'I', 'J', 'K', 'L', 'AE']))
);

const wantedTitles = ['B', 'C', 'F', 'I', 'J', 'K', 'L', 'AE'];
const selectedTitle = R.pipe(
    R.prop('Canadian Dividend All-Star List'),
    R.filter(R.propIs(Number, 'A')),
    R.map(R.pick(wantedTitles)),
    R.map(R.applySpec(renamedProps))
);

app.get('/', (req, res) => {
    res.json(selectedTitle(result));
});

app.listen(3000, R.pipe(R.always('Listening to port 3000.'), console.log));
