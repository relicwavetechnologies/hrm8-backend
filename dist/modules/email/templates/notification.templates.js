"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationEmailTemplate = void 0;
const base_template_1 = require("./base.template");
const getNotificationEmailTemplate = (data) => {
    const content = `
    <p>${data.message}</p>
    ${data.actionUrl ? `
      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${data.actionUrl}" class="button">View Details</a>
      </div>
    ` : ''}
  `;
    return (0, base_template_1.getBaseEmailLayout)(data.title, content);
};
exports.getNotificationEmailTemplate = getNotificationEmailTemplate;
