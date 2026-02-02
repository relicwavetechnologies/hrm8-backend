export const getBaseEmailLayout = (title: string, content: string): string => {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7fa; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .content-box { background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          .header { background-color: #1e293b; padding: 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 1px; }
          .body { padding: 32px; }
          .footer { padding: 24px; text-align: center; font-size: 12px; color: #64748b; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }
          .button { display: inline-block; background-color: #7c3aed; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background-color: #6d28d9; }
          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
          h2 { color: #1e293b; margin-top: 0; font-size: 20px; }
          a { color: #7c3aed; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content-box">
            <div class="header">
              <h1>HRM8</h1>
            </div>
            <div class="body">
              <h2>${title}</h2>
              ${content}
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HRM8. All rights reserved.</p>
              <p>This is an automated message, please do not reply directly to this email.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};
