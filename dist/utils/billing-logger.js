"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingLogger = void 0;
const logger_1 = require("./logger");
const log = logger_1.Logger.create('billing');
exports.BillingLogger = {
    checkoutInitiated(data) {
        log.info('Checkout initiated', data);
    },
    paymentPending(data) {
        log.info('Payment pending – awaiting external confirmation', data);
    },
    paymentCompleted(data) {
        log.info('Payment completed', data);
    },
    assignmentSuccess(data) {
        log.info('Consultant auto-assignment succeeded', data);
    },
    assignmentFailure(data) {
        log.warn('Consultant auto-assignment failed', data);
    },
    refundIssued(data) {
        log.info('Refund issued', data);
    },
};
