const BankingEmailNotificationTemplate = ({ accountHolderName, accountNumber, accountBank, accountType, transactionDetails, message, greetingPhrase, closingPhrase, signature, }) => {
    return `
        <div style="
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        ">
            <h1 style="font-size: 20px; color: #0056b3;">${greetingPhrase}</h1>
            ${accountHolderName ? `<p>Dear ${accountHolderName},</p>` : ""}
            <p>${message}</p>

            ${transactionDetails
        ? `
                <div style="
                    background-color: #f9f9f9;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 10px;
                ">
                    ${accountBank && accountNumber && accountHolderName
            ? `
                        <h2 style="font-size: 16px; color: #0056b3;">Transaction Details</h2>
                        <p><strong>Account Bank:</strong> ${accountBank}</p>
                        <p><strong>Account Number:</strong> ${accountNumber}</p>
                        <p><strong>Account Holder Name:</strong> ${accountHolderName}</p>
                        <p><strong>Account Type:</strong> ${accountType}</p>
                        <p><strong>Date:</strong> ${transactionDetails.date}</p>
                        <p><strong>Description:</strong> ${transactionDetails.description}</p>
                        <p><strong>Amount:</strong> ${transactionDetails.amount}</p>
                        ${transactionDetails.balance
                ? `<p><strong>Balance:</strong> ${transactionDetails.balance}</p>`
                : ""}
                    `
            : ""}
                </div>
            `
        : ""}

            <p style="margin-top: 20px;">${closingPhrase}</p>
            <p style="margin-top: 10px; font-weight: bold;">${signature}</p>

            <footer style="
                margin-top: 30px;
                font-size: 12px;
                color: #777;
                border-top: 1px solid #ddd;
                padding-top: 10px;
            ">
                This is an automated message from Elevate Team. Please do not reply to this email.
            </footer>
        </div>
    `;
};
export default BankingEmailNotificationTemplate;
