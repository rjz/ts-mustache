"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertExhaustiveCheck = exports.ExhaustiveCheckError = exports.SpanType = void 0;
exports.SpanType = Object.freeze({
    RAW_VALUE: 'text',
    ESCAPED_VALUE: 'name',
    UNESCAPED_VALUE: '&',
    SECTION: '#',
    INVERTED: '^',
    COMMENT: '!',
    PARTIAL: '>',
    EQUAL: '=',
});
class ExhaustiveCheckError extends TypeError {
    constructor(msg, instance) {
        super(msg);
        this.isUnexpected = true;
        this.instance = instance;
    }
}
exports.ExhaustiveCheckError = ExhaustiveCheckError;
function assertExhaustiveCheck(x) {
    throw new ExhaustiveCheckError('Variation unhandled', x);
}
exports.assertExhaustiveCheck = assertExhaustiveCheck;
//# sourceMappingURL=types.js.map