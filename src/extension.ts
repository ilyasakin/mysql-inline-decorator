import * as vscode from 'vscode';
import decorations from './decorations';
import { functions, keywords } from './dictionary';

const mysqlSpaceRegExSnippet = '(?: |\t|\r\n|\r|\n)'; // VSCode doesn't handle the \s meta-character. The \r\n permutations are to handle linefeeds in Windows, Mac & Linux respectively

// this method is called when vs code is activated
export function activate(context: vscode.ExtensionContext): void {
  let activeEditor = vscode.window.activeTextEditor;
  let currentFileExtension = '';

  if (activeEditor) {
    currentFileExtension = getFileExtention(activeEditor);
    triggerUpdateDecorations();
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (activeEditor) {
        currentFileExtension = getFileExtention(activeEditor);
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  var timeout: NodeJS.Timeout | null = null;
  function triggerUpdateDecorations() {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(updateDecorations, 150);
  }

  function getFileExtention(activeEditor: vscode.TextEditor) {
    return activeEditor.document.fileName.substring(
      activeEditor.document.fileName.lastIndexOf('.') + 1,
      activeEditor.document.fileName.length
    );
  }

  function updateDecorations() {
    if (!activeEditor || currentFileExtension === 'json') {
      return;
    }

    const templateStringRegex: RegExp = /`(([^`]|\n)*)`/g;
    const text: string = activeEditor.document.getText();

    let match;
    const wKeywords = [];
    const wFunctions = [];
    const wStrings = [];
    const wParams = [];
    const wNone = [];

    while ((match = templateStringRegex.exec(text))) {
      const wKeywordFound = findInMatch(match, keywords);
      const wFunctionFound = findInMatch(match, functions, -1);

      //at least 2 keywords found
      if (wKeywordFound.length + wFunctionFound.length > 1) {
        const startPos = activeEditor.document.positionAt(match.index);
        const endPos = activeEditor.document.positionAt(
          match.index + match[0].length
        );
        const decoration: vscode.Range = new vscode.Range(startPos, endPos);

        const wStringFound: vscode.Range[] = findInMatch(match, keywords);

        const wParamsFound: vscode.Range[] = findInMatch(match, functions);

        wKeywords.push(...wKeywordFound);
        wFunctions.push(...wFunctionFound);
        wStrings.push(...wStringFound);
        wParams.push(...wParamsFound);
        wNone.push(decoration);
      }
    }

    activeEditor.setDecorations(decorations.none, wNone);
    activeEditor.setDecorations(decorations.param, wParams);
    activeEditor.setDecorations(decorations.string, wStrings);
    activeEditor.setDecorations(decorations.keyword, wKeywords);
    activeEditor.setDecorations(decorations.function, wFunctions);
  }

  function findInMatch(
    iMatch: RegExpExecArray,
    dictionary: string[],
    iAdjustment?: number
  ): vscode.Range[] {
    console.time('test');
    const matches: vscode.Range[] = [];
    const template: string = iMatch[0];

    dictionary.forEach((keyword: string): void => {
      if (!template.includes(keyword)) {
        return;
      }

      const matchesInTemplate: RegExpMatchArray[] = [
        ...template.matchAll(
          new RegExp(`(?:\\b|^)(${keyword})(?=\\b|$)`, 'gi')
        ),
      ];

      matchesInTemplate.forEach((match: RegExpMatchArray) => {
        if (!activeEditor) {
          return;
        }

        const startPos = activeEditor.document.positionAt(
          ((match as RegExpMatchArray).index as number) + iMatch.index
        );

        const endPos: vscode.Position = activeEditor.document.positionAt(
          ((match as RegExpMatchArray).index as number) +
            match[0].length +
            iMatch.index +
            Number(iAdjustment || 0)
        );

        matches.push(new vscode.Range(startPos, endPos));
      });
    });

    console.timeEnd('test');
    return matches;
  }
}
