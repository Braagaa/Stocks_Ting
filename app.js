const excelParse = require('convert-excel-to-json');
const R = require('ramda');
const {join, resolve} = require('path');
const express = require('express');
const ejs = require('ejs');

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

const preds = {
    yieldPred,
    dividenPred,
    payoutRatioPred
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

const wantedTitle = R.pipe();

app.use((req, res) => {

});

app.get('/', (req, res) => {
    res.send('OK');
});

app.listen(3000, R.pipe(R.always('Listening to port 3000.'), console.log));
