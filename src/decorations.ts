import * as vscode from 'vscode';

export default {
  keyword: vscode.window.createTextEditorDecorationType({
    color: '#569CD6',
  }),
  param: vscode.window.createTextEditorDecorationType({
    color: '#FF0000',
  }),
  string: vscode.window.createTextEditorDecorationType({
    color: '#d69d85',
  }),
  function: vscode.window.createTextEditorDecorationType({
    color: '#FF00FF',
  }),
  none: vscode.window.createTextEditorDecorationType({
    color: '#FFFFFF',
  }),
};
