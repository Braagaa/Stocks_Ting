const querySelectorAll = R.invoker(1, 'querySelectorAll');
const querySelector = R.invoker(1, 'querySelector');
const addEventListener = R.invoker(2, 'addEventListener');
const add = R.invoker(1, 'add');
const remove = R.invoker(1, 'remove');
const replace = R.invoker(2, 'replace');

const removeFromParent = node => node.parentElement.removeChild(node);
const appendChild = R.curry((parent, child) => parent.appendChild(child));
const setStyle = R.curry((prop, value, style) => style[prop] = value);

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
    R.prop('className')
)(element);

const getHeaderLogic = R.pipe(
    R.prop('classList'),
    R.tap(R.cond(headerClass)),
    R.cond(headerLogic)
);

const tbody = document.querySelector('tbody');
const sampleColumn = document.querySelectorAll('thead tr th')[1];
const sampleRow = document.querySelector('tbody tr').children;
const yieldRange = document.querySelectorAll('#yield-min, #yield-max');
const dividendRange = document.querySelectorAll('#dividend-min, #dividend-max');
const payoutRange = document.querySelectorAll('#payout-min, #payout-max');
const yieldColumn = document.querySelectorAll('tbody .stock .yield');
const payoutColumn = document.querySelectorAll('tbody .stock .ttm');

const newListDisplay = R.pipe(
    R.prop('element'),
    removeFromParent,
    appendChild(tbody)
);

//highlight features

const qualifiedForHighlight = R.curry((lt, gt, list) => 
    R.filter(R.propSatisfies(
        R.pipe(parseFloat, R.both(R.gte(R.__, lt), R.lte(R.__, gt))),
        'textContent'
    ))
(list));

const highLight = R.curry((column, range) => R.pipe(
    R.sort((a, b) => a - b),
    R.apply(qualifiedForHighlight),
    R.applyTo(column),
    R.map(R.prop('style')),
    R.forEach(setStyle('backgroundColor', 'gold'))
)(range));

const validateValuesHightlight = (range, column) => R.pipe(
    R.map(R.pipe(R.prop('value'), parseFloat)),
    R.when(R.none(isNaN), highLight(column))
)(range);

const highLightSubmit = function(e) {
    e.preventDefault();
    validateValuesHightlight(yieldRange, yieldColumn);
    validateValuesHightlight(payoutRange, payoutColumn);
}
const columnClick = R.pipe(
    R.prop('currentTarget'),
    R.tap(removeOtherHeaderOrders),
    R.juxt([getHeaderLogic, getColumnClass]),
    R.append(getCurrentStockList(document)),
    R.apply(order),
    R.forEach(newListDisplay)
);

R.pipe(
    querySelectorAll('.header'),
    R.forEach(addEventListener('click', columnClick))
)(document);

R.pipe(
    querySelector('#highlight-button'),
    addEventListener('click', highLightSubmit)
)(document);
