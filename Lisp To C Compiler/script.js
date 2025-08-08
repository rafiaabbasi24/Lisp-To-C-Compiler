let debugLogs = [], state = {};

const inputArea = document.getElementById('input');
inputArea.value = localStorage.getItem('lastInput') || inputArea.value;

inputArea.addEventListener('input', () => {
  localStorage.setItem('lastInput', inputArea.value);

  if (document.getElementById('liveCompile').checked) {
    compileAll();
    const ir = JSON.stringify(state.ir, null, 2);
    const code = state.cCode || 'Error: ' + (state.error || 'Unknown error');
    document.getElementById('ir').textContent = ir;
    document.getElementById('cOutput').textContent = code;
  }
});

document.getElementById('toggleTheme').onclick = () => {
  document.body.classList.toggle('light');
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
};

if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
}

const title = "LISP to C Compiler";
const h2 = document.querySelector("h2");
h2.textContent = "";
let idx = 0;
function typeTitle() {
  if (idx < title.length) {
    h2.textContent += title.charAt(idx++);
    setTimeout(typeTitle, 100);
  }
}
typeTitle();

function log(step) {
  debugLogs.push(step);
}

const themeIcon = document.getElementById('themeIcon');

function updateThemeIcon() {
  themeIcon.textContent = document.body.classList.contains('light') ? '🌙' : '🌞';
}

document.getElementById('toggleTheme').onclick = () => {
  document.body.classList.toggle('light');
  localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
  updateThemeIcon();
};

if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light');
  updateThemeIcon();
}


function tokenize(input) {
  let current = 0, tokens = [];
  while (current < input.length) {
    let char = input[current];
    if (/\s/.test(char)) { current++; continue; }
    if (char === '(') { tokens.push({ type: 'left_paren', value: '(' }); current++; continue; }
    if (char === ')') { tokens.push({ type: 'right_paren', value: ')' }); current++; continue; }
    if (/[0-9]/.test(char)) {
      let value = '';
      while (/[0-9]/.test(input[current])) value += input[current++];
      tokens.push({ type: 'number', value });
      continue;
    }
    if (/[a-z+\-*/]/i.test(char)) {
      let value = '';
      while (/[a-z+\-*/]/i.test(input[current])) value += input[current++];
      tokens.push({ type: 'name', value });
      continue;
    }
    throw new Error('Unexpected character: ' + char);
  }
  return tokens;
}

function parse(tokens) {
  let current = 0;
  function walk() {
    let token = tokens[current];
    if (token.type === 'number') {
      log(`Parsed NumberLiteral: ${token.value}`);
      return { type: 'NumberLiteral', value: tokens[current++].value };
    }
    if (token.type === 'left_paren') {
      current++;
      let name = tokens[current++].value;
      let node = { type: 'CallExpression', name, params: [] };
      log(`Begin CallExpression: ${name}`);
      while (tokens[current] && tokens[current].type !== 'right_paren') {
        node.params.push(walk());
        if (current >= tokens.length) throw new Error("Expected ')'");
      }
      current++;
      log(`End CallExpression: ${name}`);
      return node;
    }
    throw new Error('Unexpected token type: ' + token.type);
  }
  let ast = { type: 'Program', body: [] };
  while (current < tokens.length) {
    ast.body.push(walk());
  }
  return ast;
}

function transform(ast) {
  return ast;
}

function generateC(node) {
  switch (node.type) {
    case 'Program':
      return node.body.map(generateC).join(';\n') + ';';
    case 'NumberLiteral':
      return node.value;
    case 'CallExpression': {
      let fn = node.name;
      let args = node.params.map(generateC);
      const expectedArgs = {
        add: 2, subtract: 2, multiply: 2, divide: 2,
        '+': 2, '-': 2, '*': 2, '/': 2
      };
      if (expectedArgs[fn] !== undefined && args.length !== expectedArgs[fn]) {
        throw new Error(`Function "${fn}" requires exactly ${expectedArgs[fn]} arguments, but got ${args.length}`);
      }
      if (fn === 'add' || fn === '+') return `(${args.join(' + ')})`;
      if (fn === 'subtract' || fn === '-') return `(${args.join(' - ')})`;
      if (fn === 'multiply' || fn === '*') return `(${args.join(' * ')})`;
      if (fn === 'divide' || fn === '/') return `(${args.join(' / ')})`;
      return `${fn}(${args.join(', ')})`;
    }
    default:
      throw new TypeError('Unknown node type: ' + node.type);
  }
}

function generateFullCCode(ast) {
  const expr = generateC(ast);
  return `#include <stdio.h>

int main() {
    int result = ${expr};
    printf("Result: %d\\n", result);
    return 0;
}`;
}

function generateIR(ast) {
  return JSON.stringify(ast, null, 2);
}

function compileAll() {
  debugLogs = [];
  try {
    let input = document.getElementById('input').value;
    let tokens = tokenize(input);
    log(`Tokenized input: ${tokens.length} tokens`);
    let ast = parse(tokens);
    log(`Parsed AST successfully.`);
    let ir = transform(ast);
    log(`Transformed to IR.`);
    let cCode = generateFullCCode(ir);
    state = { tokens, ast, ir, cCode };
  } catch (e) {
    state = { tokens: [], ast: {}, ir: {}, cCode: '', error: e.message };
    debugLogs.push('Error: ' + e.message);
  }
}

function showTokens() {
  compileAll();
  document.getElementById('tokens').textContent = JSON.stringify(state.tokens, null, 2);
  toggle('tokens');
}


function buildASTTree(node, container, depth = 0) {
  const ul = document.createElement('ul');

  const li = document.createElement('li');
  const label = document.createElement('span');

  if (node.type === 'NumberLiteral') {
    label.textContent = `Number: ${node.value}`;
  } else if (node.type === 'CallExpression') {
    label.textContent = `Call: ${node.name}`;
    if (node.params.length > 0) {
      node.params.forEach(param => buildASTTree(param, ul, depth + 1));
    }
  } else if (node.type === 'Program') {
    label.textContent = `Program`;
    node.body.forEach(child => buildASTTree(child, ul, depth + 1));
  } else {
    label.textContent = `${node.type}`;
  }

  li.appendChild(label);
  li.appendChild(ul);
  container.appendChild(li);
}

function showAST() {
  compileAll();
  const treeContainer = document.getElementById('astTree');
  treeContainer.innerHTML = ''; 
  buildASTTree(state.ast, treeContainer);
  toggle('astTree');
}

function showIR() {
  compileAll();
  document.getElementById('ir').textContent = JSON.stringify(state.ir, null, 2);
  toggle('ir');
}


function showCCode() {
  compileAll();
  const code = state.cCode || 'Error: ' + (state.error || 'Unknown error');
  document.getElementById('cOutput').textContent = code;
  toggle('cOutput');
}


function showDebug() {
  compileAll();
  document.getElementById('debug').textContent = debugLogs.join('\n');
  toggle('debug');
}

function toggle(id) {
  ['tokens', 'astTree', 'ir', 'cOutput', 'debug'].forEach(sec => {
    const el = document.getElementById(sec);
    if (el) {
      el.style.display = (sec === id ? 'block' : 'none');
      if (sec === id) el.classList.add('show');
      else el.classList.remove('show');
    }
  });
}


function downloadCCode() {
  compileAll();
  const code = state.cCode || 'Error: ' + (state.error || 'Unknown error');
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'output.c';
  a.click();
  URL.revokeObjectURL(url);
}
