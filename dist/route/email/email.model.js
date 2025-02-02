import { envConfig } from "../../env.js";
import BankingEmailNotificationTemplate from "../../utils/emailFormat/emailFormat.js";
import { Resend } from "resend";
const resend = new Resend(envConfig.RESEND_API_KEY);
export const emailPostModel = async (params) => {
    const domain = process.env.NODE_ENV === "production"
        ? "<info@help.elevateglobal.app>"
        : "<help@portfolio-glorioso.site>";
    const { to, subject, accountBank, accountType, accountHolderName, accountNumber, transactionDetails, message, greetingPhrase, closingPhrase, signature, } = params;
    const emailProps = {
        to,
        subject,
        accountBank,
        accountType,
        accountHolderName,
        accountNumber,
        transactionDetails,
        message,
        greetingPhrase,
        closingPhrase,
        signature,
    };
    const { data, error } = await resend.emails.send({
        from: `Elevate Team ${domain}`,
        to: to,
        subject: subject,
        react: BankingEmailNotificationTemplate(emailProps),
    });
    if (error) {
        throw new Error("Failed to send email");
    }
    return data;
};
export const emailBatchPostModel = async (batchData) => {
    const { data, error } = await resend.batch.send(batchData);
    if (error) {
        throw new Error("Failed to send email");
    }
    return data;
};
