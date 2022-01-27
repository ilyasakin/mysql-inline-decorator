import * as vscode from 'vscode';
import decorations from './decorations';
import { functions, keywords } from './dictionary';

const MEASURE_SPEED: boolean = true;
const FILE_EXTENSION_WHITELIST: string[] = ['js', 'ts'];
const TEMPLATE_REGEX: RegExp = /`([^`]|(\`))*?(?<!\\)`/gm;

let activeEditor: vscode.TextEditor | undefined =
  vscode.window.activeTextEditor;
let currentFileExtension: string = '';

const findInMatch = (
  iMatch: RegExpExecArray,
  dictionary: string[],
  iAdjustment?: number
): vscode.Range[] => {
  if (MEASURE_SPEED) {
    console.time('Find In Match Completion Time');
  }

  const matches: vscode.Range[] = [];
  const template: string = iMatch[0];

  dictionary.forEach((keyword: string): void => {
    if (!activeEditor || template.indexOf(keyword) === -1) {
      return;
    }

    const matchesInTemplate: RegExpMatchArray[] = [
      ...template.matchAll(new RegExp(`(?:\\b|^)(${keyword})(?=\\b|$)`, 'gi')),
    ];

    for (const match of matchesInTemplate) {
      const startPos: vscode.Position = activeEditor.document.positionAt(
        match.index! + iMatch.index
      );

      const endPos: vscode.Position = activeEditor.document.positionAt(
        match.index! + match[0].length + iMatch.index + Number(iAdjustment || 0)
      );

      matches.push(new vscode.Range(startPos, endPos));
    }
  });

  if (MEASURE_SPEED) {
    console.timeEnd('Find In Match Completion Time');
  }

  return matches;
};

const updateDecorations = (): void => {
  if (
    !activeEditor ||
    !FILE_EXTENSION_WHITELIST.includes(currentFileExtension)
  ) {
    return;
  }

  const text: string = activeEditor.document.getText();

  let match: RegExpExecArray | null;
  const wKeywords: vscode.Range[] = [];
  const wFunctions: vscode.Range[] = [];
  const wStrings: vscode.Range[] = [];
  const wParams: vscode.Range[] = [];
  const wNone: vscode.Range[] = [];

  while ((match = TEMPLATE_REGEX.exec(text))) {
    const wKeywordFound: vscode.Range[] = findInMatch(match, keywords);
    const wFunctionFound: vscode.Range[] = findInMatch(match, functions, -1);

    //at least 2 keywords found
    if (wKeywordFound.length + wFunctionFound.length > 1) {
      const startPos: vscode.Position = activeEditor.document.positionAt(
        match.index
      );
      const endPos: vscode.Position = activeEditor.document.positionAt(
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
};

let timeout: NodeJS.Timeout | null = null;
const triggerUpdateDecorations = (): void => {
  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(updateDecorations, 150);
};

const getFileExtension = (activeEditor: vscode.TextEditor): string => {
  return activeEditor.document.fileName.substring(
    activeEditor.document.fileName.lastIndexOf('.') + 1,
    activeEditor.document.fileName.length
  );
};

// this method is called when vs code is activated
export const activate = (context: vscode.ExtensionContext): void => {
  if (activeEditor) {
    currentFileExtension = getFileExtension(activeEditor);
    triggerUpdateDecorations();
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor: vscode.TextEditor | undefined): void => {
      if (editor) {
        activeEditor = editor;
        currentFileExtension = getFileExtension(activeEditor);
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event: vscode.TextDocumentChangeEvent): void => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );
};
