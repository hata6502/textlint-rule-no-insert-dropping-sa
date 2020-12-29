// MIT © 2017 azu
"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var assert = require("assert");
var arrayFindIndex = require("array-find-index");
var kuromojin = require("kuromojin");
var createMatcher = require("morpheme-match-all");
var saInsertDict = require("./dict/sa-insert-dict");
var saDroppingDict = require("./dict/sa-dropping-dict");
var matchAll = createMatcher(saInsertDict.concat([saDroppingDict]));
/**
 * 実際に一致してるtokenのindexを返す
 * 「さ」のtokenのindexを返すイメージ
 * 「さ」がない場合は先頭のindex
 * @param tokens
 * @param actualTokens
 * @returns {number}
 */
var findSaTokenIndex = function findSaTokenIndex(tokens, actualTokens) {
    var saTokenIndex = arrayFindIndex(tokens, function (token) {
        return token.hasOwnProperty("_index");
    });
    // 無い場合は先頭を返す
    if (saTokenIndex === -1) {
        return actualTokens[0].word_position - 1;
    }
    // assert(saTokenIndex !== -1, "「さ」のtokenが見つかりません。Issueで報告してください。");
    var actualSaToken = actualTokens[saTokenIndex];
    return actualSaToken.word_position - 1;
};

var replaceWithCaptureTokens = function replaceWithCaptureTokens(text, tokens, actualTokens) {
    var resultText = text;
    tokens.forEach(function (token, index) {
        // _captureがないのは無視
        if (!token._capture) {
            return;
        }
        var actualToken = actualTokens[index];
        resultText = resultText.replace(token._capture, actualToken.surface_form);
    });
    return resultText;
};
var reporter = function reporter(context) {
    var Syntax = context.Syntax,
        RuleError = context.RuleError,
        report = context.report,
        fixer = context.fixer,
        getSource = context.getSource;

    return _defineProperty({}, Syntax.Str, function (node) {
        var text = getSource(node);
        return kuromojin.tokenize(text).then(function (tokens) {
            var matchResults = matchAll(tokens);
            matchResults.forEach(function (matchResult) {
                var firstToken = matchResult.tokens[0];
                var lastToken = matchResult.tokens[matchResult.tokens.length - 1];
                var firstWordIndex = Math.max(firstToken.word_position - 1, 0);
                var lastWorkIndex = Math.max(lastToken.word_position - 1, 0);
                var saTokenIndex = findSaTokenIndex(matchResult.dict.tokens, matchResult.tokens);
                // replace $1
                var message = replaceWithCaptureTokens(matchResult.dict.message, matchResult.dict.tokens, matchResult.tokens);
                var expected = replaceWithCaptureTokens(matchResult.dict.expected, matchResult.dict.tokens, matchResult.tokens);
                if (expected) {
                    report(node, new RuleError(message, {
                        index: saTokenIndex,
                        fix: fixer.replaceTextRange([firstWordIndex, lastWorkIndex + lastToken.surface_form.length], expected)
                    }));
                } else {
                    report(node, new RuleError(message, {
                        index: saTokenIndex
                    }));
                }
            });
        });
    });
};

module.exports = {
    linter: reporter,
    fixer: reporter
};
//# sourceMappingURL=textlint-rule-no-insert-dropping-sa.js.map