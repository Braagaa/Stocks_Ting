const querySelectorAll = R.invoker(1, 'querySelectorAll');
const querySelector = R.invoker(1, 'querySelector');
const addEventListener = R.invoker(2, 'addEventListener');
const add = R.invoker(1, 'add');
const remove = R.invoker(1, 'remove');
const replace = R.invoker(2, 'replace');

const removeFromParent = node => node.parentElement.removeChild(node);
const appendChild = R.curry((parent, child) => parent.appendChild(child));

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

const newListDisplay = R.pipe(
    R.prop('element'),
    removeFromParent,
    appendChild(tbody)
);

const thing = R.pipe(
    R.prop('currentTarget'),
    R.tap(removeOtherHeaderOrders),
    R.juxt([getHeaderLogic, getColumnClass]),
    R.append(getCurrentStockList(document)),
    R.apply(order),
    R.forEach(newListDisplay)
);

R.pipe(
    querySelectorAll('.header'),
    R.forEach(addEventListener('click', thing))
)(document);
