const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const getAst = (entry) => {
  const fileContent = fs.readFileSync(entry, "utf-8");
  const ast = parser.parse(fileContent, { sourceType: "module" });
  return ast;
};

const traverseAst = (entry) => {
  const dependences = {};
  const ast = getAst(entry);
  traverse(ast, {
    ImportDeclaration(args) {
      const { node } = args;
      const filename = path.dirname(entry);
      const filePath = path.join(filename, node.source.value);
      dependences[node.source.value] = "./" + filePath;
    },
  });

  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"],
  });

  return {
    filename: entry,
    dependences,
    code,
  };
};

const generateDependenceGraph = (entry) => {
  const entryModule = traverseAst(entry);
  const moduleArray = [entryModule];
  const graph = {};

  for (let i = 0; i < moduleArray.length; i++) {
    const curModuleDependences = moduleArray[i]["dependences"];
    if (curModuleDependences) {
      for (let j in curModuleDependences) {
        const innerModule = traverseAst(curModuleDependences[j]);
        moduleArray.push(innerModule);
      }
    }
  }
  moduleArray.forEach((item) => {
    graph[item.filename] = {
      dependences: item.dependences,
      code: item.code,
    };
  });

  return graph;
};

const generateCode = (entry) => {
  const graph = JSON.stringify(generateDependenceGraph(entry));

  return `
    (function(graph) {
      function require(module) {
        function localRequire(relativePath) {
          return require(graph[module].dependences[relativePath])
        }
        var exports = {};
        (function(require, exports, code){
          eval(code)
        })(localRequire, exports, graph[module].code);
        return exports;
      }
      require('${entry}')
    })(${graph})
  `;
};

const executeCode = generateCode("./src/index.js");
console.log(executeCode);
