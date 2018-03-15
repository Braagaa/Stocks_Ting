const querySelectorAll = R.invoker(1, 'querySelectorAll');
const querySelector = R.invoker(1, 'querySelector');
const addEventListener = R.invoker(2, 'addEventListener');
const add = R.invoker(1, 'add');
const remove = R.invoker(1, 'remove');
const replace = R.invoker(2, 'replace');

const removeFromParent = node => node.parentElement.removeChild(node);
const appendChild = R.curry((parent, child) => parent.appendChild(child));
const setProp = R.curry((prop, value, obj) => obj[prop] = value);

const getClassText = R.curry((child, parent) => 
    R.pipe(querySelector(child), R.prop('textContent'))(parent)
);

const getTextParseFloat = R.curry((child, parent) => 
    R.pipe(getClassText(child), parseFloat, R.defaultTo('n/a'))(parent)
);

const getPropOr = R.curry((prop, obj) => R.pipe(
    R.prop(prop),
    R.when(R.equals('n/a'), R.always(Number.NEGATIVE_INFINITY))
)(obj));
const order = R.curry(
    (order, prop, list) => R.sort(order(getPropOr(prop)), list)
);

const childGreenTest = R.curry((query, row) => R.pipe(
    querySelector(query), 
    R.path(['style', 'backgroundColor']), 
    R.complement(R.equals('transparent'))
)(row));

const dividendGreenTest = R.pipe(
    querySelectorAll('.div1yr, .div3yr, .div5yr, .div10yr'),
    R.map(R.path(['style', 'backgroundColor'])),
    R.any(R.complement(R.equals('transparent')))
);

const createList = {
    ticker: getClassText('.ticker'),
    company: getClassText('.company'),
    yield: getTextParseFloat('.yield'),
    div1yr: getTextParseFloat('.div1yr'),
    div3yr: getTextParseFloat('.div3yr'),
    div5yr: getTextParseFloat('.div5yr'),
    div10yr: getTextParseFloat('.div10yr'),
    ttm: getTextParseFloat('.ttm'),
    element: R.identity
};

const greenHightlightTestObj = {
    yieldTest: childGreenTest('.yield'),
    payoutTest: childGreenTest('.ttm'),
    dividendTest: dividendGreenTest
};

const greenPass = {
    yieldTest: true,
    payoutTest: true,
    dividendTest: true
}

const headerLogic = [
    [R.contains('up'), R.always(R.ascend)], 
    [R.contains('down'), R.always(R.descend)],
    [R.T, R.always(R.descend)]
];

const headerClass = [
    [R.contains('up'), replace('up', 'down')],
    [R.contains('down'), replace('down', 'up')],
    [R.T, add('up')]
];

const getCurrentStockList = R.pipe(
    querySelectorAll('.stock'),
    R.map(R.applySpec(createList))
);

const removeOtherHeaderOrders = element => R.pipe(
    R.path(['parentElement', 'children']),
    R.filter(R.complement(R.equals(element))),
    R.map(R.prop('classList')),
    R.forEach(remove('up')),
    R.forEach(remove('down'))
)(element);

const getColumnClass = element => R.pipe(
    R.path(['parentElement', 'children']),
    R.indexOf(element),
    R.nth(R.__, sampleRow),
    R.prop('className'),
    R.split(' '),
    R.nth(0)
)(element);

const getHeaderLogic = R.pipe(
    R.prop('classList'),
    R.tap(R.cond(headerClass)),
    R.cond(headerLogic)
);

const tbody = document.querySelector('tbody');
const sampleColumn = document.querySelectorAll('thead tr th')[1];
const sampleRow = document.querySelector('tbody tr').children;
const allRows = document.querySelectorAll('tbody .stock');
const yieldRange = document.querySelectorAll('#yield-min, #yield-max');
const dividendRange = document.querySelectorAll('#dividend-min, #dividend-max');
const payoutRange = document.querySelectorAll('#payout-min, #payout-max');
const yieldColumn = document.querySelectorAll('tbody .stock .yield');
const payoutColumn = document.querySelectorAll('tbody .stock .ttm');
const dividenColumns = document.querySelectorAll('.div1yr, .div3yr, .div5yr, .div10yr');
const noFilterRadio = document.getElementById('no-filter');
const onlyHighlightedRadio = document.getElementById('only-highlighted');
const onlyGreeRadio = document.getElementById('only-green');

const newListDisplay = R.pipe(
    R.prop('element'),
    removeFromParent,
    appendChild(tbody)
);

//highlight features

const paintColor = R.curry((color, list) => R.pipe(
    R.map(R.prop('style')),
    R.forEach(setProp('backgroundColor', color))
)(list));

const qualifiedForHighlight = R.curry((lt, gt, list) => 
    R.partition(R.propSatisfies(
        R.pipe(parseFloat, R.both(R.gte(R.__, lt), R.lte(R.__, gt))),
        'textContent'
    ))
(list));

const highlightGold = R.curry((column, range) => R.pipe(
    R.sort((a, b) => a - b),
    R.apply(qualifiedForHighlight),
    R.applyTo(column),
    R.zipWith(R.call, [paintColor('gold'), paintColor('transparent')])
)(range));

const validateValuesHightlight = (range, column) => R.pipe(
    R.map(R.pipe(R.prop('value'), parseFloat)),
    R.when(R.none(isNaN), highlightGold(column))
)(range);

const takeOffAllHightlight = R.pipe(
    R.map(R.prop('children')),
    R.flatten,
    R.map(R.prop('style')),
    R.forEach(setProp('backgroundColor', 'transparent'))
);

const greenFilter = R.pipe(
    R.applySpec(greenHightlightTestObj),
    R.whereEq(greenPass)
);

const colorTickerCompany = R.curry((color, list)=> R.pipe(
    R.map(querySelectorAll('.ticker, .company')),
    R.flatten,
    R.map(R.prop('style')),
    R.forEach(setProp('backgroundColor', color))
)(list));

const highLightSubmit = function(e) {
    e.preventDefault();

    validateValuesHightlight(yieldRange, yieldColumn);
    validateValuesHightlight(dividendRange, dividenColumns);
    validateValuesHightlight(payoutRange, payoutColumn);
    
    const [green, nonGreen] = R.partition(greenFilter, allRows);
    colorTickerCompany('yellowgreen', green);
    colorTickerCompany('transparent', nonGreen);

    if (onlyHighlightedRadio.checked === true) 
        onlyHighlighted('gold', allRows);

    if (onlyGreeRadio.checked === true)
        onlyHighlighted('yellowgreen', allRows);
}

//reset

const resetOptions = R.pipe(
    R.flatten,
    R.forEach(setProp('value', ''))
);

const resetClick = function(e) {
    e.preventDefault();
    resetOptions([yieldRange, dividendRange, payoutRange]);
    takeOffAllHightlight(allRows);
    setProp('checked', true, noFilterRadio);
    displayRows(allRows);
}

//filter

const addRemoveRows = R.curry((fn, list) => R.pipe(
    R.map(R.prop('classList')),
    R.forEach(fn('hide'))
)(list));
const hideRows = addRemoveRows(add);
const displayRows = addRemoveRows(remove);
const displayAllRows = addRemoveRows(remove);

const onlyHighlighted = R.curry((color, list) => R.pipe(
    R.map(R.prop('children')),
    R.partition(R.any(R.pathEq(['style', 'backgroundColor'], color))),
    R.map(R.map(R.pipe(R.nth(0), R.prop('parentElement')))),
    R.zipWith(R.call, [displayRows, hideRows])
)(list));

const columnClick = R.pipe(
    R.prop('currentTarget'),
    R.tap(removeOtherHeaderOrders),
    R.juxt([getHeaderLogic, getColumnClass]),
    R.append(getCurrentStockList(document)),
    R.apply(order),
    R.forEach(newListDisplay)
);

takeOffAllHightlight(allRows);

R.pipe(
    querySelectorAll('.header'),
    R.forEach(addEventListener('click', columnClick))
)(document);

R.pipe(
    querySelector('#highlight-button'),
    addEventListener('click', highLightSubmit)
)(document);

R.pipe(
    querySelector('#reset-button'),
    addEventListener('click', resetClick)
)(document);

R.pipe(
    querySelector('#only-highlighted'),
    addEventListener(
        'change', 
        R.partial(onlyHighlighted, ['gold', allRows])
    )
)(document);

R.pipe(
    querySelector('#only-green'),
    addEventListener(
        'change', 
        R.partial(onlyHighlighted, ['yellowgreen', allRows]))
)(document);

R.pipe(
    querySelector('#no-filter'),
    addEventListener(
        'change', 
        R.partial(displayRows, [allRows]))
)(document);
