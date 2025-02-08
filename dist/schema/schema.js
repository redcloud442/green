import { z } from "zod";
//for auth and register
export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
export const LoginSchema = z.object({
    userName: z
        .string()
        .min(6, "Username must be at least 6 characters long")
        .max(20, "Username must be at most 20 characters long")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    password: z.string().min(6),
});
export const loginCheckSchema = z.object({
    userName: z
        .string()
        .min(6, "Username must be at least 6 characters long")
        .max(20, "Username must be at most 20 characters long")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});
//register
export const registerUserSchema = z.object({
    activeMobile: z
        .string()
        .optional()
        .refine((val) => val === undefined || val === "" || /^0\d{10}$/.test(val), "Active Mobile must start with '0' and contain exactly 11 digits."),
    activeEmail: z
        .string()
        .optional()
        .nullable()
        .transform((val) => (val?.trim() === "" ? null : val))
        .refine((val) => val === null || z.string().email().safeParse(val).success, "Invalid email address"),
    userId: z.string().uuid(),
    userName: z
        .string()
        .min(6, "Username must be at least 6 characters long")
        .max(20, "Username must be at most 50 characters long")
        .regex(/^[a-zA-Z][a-zA-Z0-9._]*$/, "Username must start with a letter and can only contain letters, numbers, dots, and underscores"),
    password: z.string().min(6),
    firstName: z.string().min(2),
    lastName: z.string().min(2),
    referalLink: z.string().min(2),
    url: z.string().min(2),
});
//for deposit
export const depositSchema = z.object({
    amount: z
        .string()
        .min(3, "Amount is required and must be at least 300 pesos")
        .max(6, "Amount must be less than 6 digits")
        .regex(/^\d+$/, "Amount must be a number")
        .refine((amount) => parseInt(amount, 10) >= 300, {
        message: "Amount must be at least 300 pesos",
    }),
    topUpMode: z.string().min(1, "Top up mode is required"),
    accountName: z.string().min(1, "Field is required"),
    accountNumber: z.string().min(1, "Field is required"),
    publicUrls: z.array(z.string().min(1, "Receipt is required")),
});
export const updateDepositSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().optional(),
    requestId: z.string().uuid(),
});
export const depositHistoryPostSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
    sortBy: z.string().optional(),
    columnAccessor: z.string().min(3),
    isAscendingSort: z.boolean(),
    userId: z.string().optional(),
});
export const depositListPostSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
    columnAccessor: z.string().min(3),
    merchantFilter: z.string().optional(),
    userFilter: z.string().optional(),
    statusFilter: z.enum(["APPROVED", "REJECTED", "PENDING"]),
    isAscendingSort: z.boolean(),
    dateFilter: z
        .object({
        start: z.string().optional(),
        end: z.string().optional(),
    })
        .optional(),
});
//user schema
export const userSchemaPut = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    userId: z.string().uuid(),
});
export const userSchemaPost = z.object({
    memberId: z.string().uuid(),
});
export const userSchemaPatch = z.object({
    memberId: z.string().uuid(),
    action: z.enum(["updateRole", "banUser"]),
    role: z.enum(["ADMIN", "MEMBER", "MERCHANT", "ACCOUNTING"]).optional(),
    type: z.enum(["BAN", "UNBAN"]).optional(),
});
export const userProfileSchemaPatch = z.object({
    profilePicture: z.string().min(1),
    userId: z.string().uuid(),
});
export const userChangePasswordSchema = z.object({
    password: z.string().min(6),
    userId: z.string().uuid(),
});
export const userGenerateLinkSchema = z.object({
    formattedUserName: z.string().min(1),
});
export const userSponsorSchema = z.object({
    userId: z.string().uuid(),
});
export const userListSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
    columnAccessor: z.string().min(3),
    isAscendingSort: z.boolean(),
    userRole: z.string().optional(),
    dateCreated: z.string().optional(),
    bannedUser: z.boolean().optional(),
});
export const userActiveListSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
    columnAccessor: z.string().min(3),
    isAscendingSort: z.boolean(),
});
export const userPreferredBankSchema = z.object({
    accountNumber: z.string().min(1),
    accountName: z.string().min(1),
    bankName: z.string().min(1),
});
export const userProfileDataSchema = z
    .object({
    value: z.string(),
    type: z.enum(["activeMobile", "activeEmail"]),
    userId: z.string().uuid(),
})
    .refine((data) => {
    if (data.type === "activeMobile") {
        return /^0\d{10}$/.test(data.value); // Validate mobile format
    }
    if (data.type === "activeEmail") {
        return z.string().email().safeParse(data.value).success; // Validate email format
    }
    return false;
}, {
    message: "Invalid value for the selected type.",
    path: ["value"], // Highlight the error on the value field
});
//transaction schema
export const transactionSchemaPost = z.object({
    limit: z.number().min(1).max(10),
    page: z.number().min(1),
});
//referral schema
export const referralPostSchema = z.object({
    teamMemberId: z.string().uuid(),
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
});
export const directReferralsSchemaPost = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
    columnAccessor: z.string().min(3),
    isAscendingSort: z.boolean(),
});
export const indirectReferralsSchemaPost = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
    columnAccessor: z.string().min(3),
    isAscendingSort: z.boolean(),
});
//packages schema
export const packagePostSchema = z.object({
    amount: z.number().refine((val) => Number(val) >= 300, {
        message: "Minimum amount is 300 pesos",
    }),
    packageId: z.string().uuid(),
});
export const createPackagePostSchema = z.object({
    packageName: z.string().min(3),
    packageDescription: z.string().min(3),
    packagePercentage: z.string().min(1),
    packageDays: z.string().min(1),
    packageColor: z.string().optional(),
    packageImage: z.string().min(3).optional(),
});
export const updatePackageSchema = z.object({
    packageName: z.string().min(3),
    packageDescription: z.string().min(3),
    packagePercentage: z.string().min(1),
    packageDays: z.string().min(1),
    packageIsDisabled: z.boolean(),
    packageColor: z.string().nullable().optional(),
    packageImage: z.string().nullable().optional(),
    packageId: z.string().uuid(),
});
export const claimPackagePutSchema = z.object({
    amount: z.number().min(1),
    earnings: z.number(),
    packageConnectionId: z.string().uuid(),
});
//merchant schema
export const merchantDeleteSchema = z.object({
    merchantId: z.string().uuid(),
});
export const merchantPostSchema = z.object({
    accountNumber: z.string().min(1),
    accountType: z.string().min(1),
    accountName: z.string().min(1),
});
export const merchantPatchSchema = z.object({
    amount: z.number().min(1),
    memberId: z.string().uuid(),
    userName: z.string().min(1),
});
export const merchantBankSchema = z.object({
    page: z.number().min(1).max(10),
    limit: z.number().min(1).max(10),
});
//withdraw schema
export const withdrawPostSchema = z.object({
    earnings: z.string(),
    amount: z
        .string()
        .min(2, "Minimum amount is required atleast 30 pesos")
        .refine((amount) => parseInt(amount, 10) >= 30, {
        message: "Amount must be at least 30 pesos",
    }),
    bank: z.string().min(1, "Please select a bank"),
    accountName: z
        .string()
        .min(6, "Account name is required")
        .max(40, "Account name must be at most 24 characters"),
    accountNumber: z
        .string()
        .min(6, "Account number is required")
        .max(24, "Account number must be at most 24 digits"),
});
export const withdrawHistoryPostSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
    columnAccessor: z.string().min(3).optional(),
    isAscendingSort: z.boolean().optional(),
    userId: z.string().optional(),
});
export const updateWithdrawSchema = z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().optional(),
    requestId: z.string().uuid(),
});
export const withdrawListPostSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
    search: z.string().optional(),
    columnAccessor: z.string().min(3),
    userFilter: z.string().optional(),
    statusFilter: z.enum(["APPROVED", "REJECTED", "PENDING"]),
    isAscendingSort: z.boolean(),
    dateFilter: z
        .object({
        start: z.string().optional(),
        end: z.string().optional(),
    })
        .optional(),
});
export const withdrawHistoryReportPostSchema = z.object({
    dateFilter: z
        .object({
        start: z.string().optional(),
        end: z.string().optional(),
    })
        .optional(),
});
export const withdrawTotalReportPostSchema = z.object({
    type: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    take: z.number().optional(),
    skip: z.number().optional(),
});
//dashboard schema
export const dashboardPostSchema = z.object({
    dateFilter: z
        .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    })
        .optional(),
});
//leaderboard schema
export const leaderboardPostSchema = z.object({
    leaderBoardType: z.enum(["DIRECT", "INDIRECT"]),
    limit: z.number().min(1).max(10),
    page: z.number().min(1),
});
// options schema
export const userOptionsPostSchema = z.object({
    page: z.number().min(1).max(10),
    limit: z.number().min(1).max(500),
});
//socket schema
export const socketSchema = z.object({
    userId: z.string().uuid(),
});
export const socketJoinRoomSchema = z.object({
    teamMemberId: z.string().uuid(),
});
export const socketGetNotificationSchema = z.object({
    take: z.number().max(100).optional(),
    skip: z.number().optional(),
    teamMemberId: z.string().uuid(),
});
//email schema
export const emailPostSchema = z.object({
    to: z.string().email(),
    subject: z.string().min(3),
    accountHolderName: z.string().min(1).optional(),
    accountBank: z.string().min(1).optional(),
    accountType: z.string().min(1).optional(),
    accountNumber: z.string().min(1).optional(),
    transactionDetails: z
        .object({
        date: z.string().min(1),
        description: z.string().min(1).optional(),
        amount: z.string().min(1).optional(),
        balance: z.string().optional(),
    })
        .optional(),
    message: z.string().min(1),
    greetingPhrase: z.string().min(3),
    closingPhrase: z.string().min(3),
    signature: z.string().min(3),
});
export const emailBatchPostSchema = z.object({
    batchData: z.array(z.object({
        to: z.string().email(),
        from: z.string().email(),
        subject: z.string().min(3),
        html: z.any(),
    })),
});
//messaging schema
export const messagingPostSchema = z.object({
    number: z.string().min(10).max(11),
    message: z.string().min(1),
});
export const messagingBatchPostSchema = z.object({
    number: z.array(z.string().min(10).max(11)),
    message: z.string().min(1),
});
//nootification
export const notificationPostSchema = z.object({
    chartData: z.string().min(10).max(11),
    memberId: z.string().min(1),
});
export const notificationBatchPostSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1),
});
export const notificationBatchPutSchema = z.object({
    batchData: z.array(z.object({
        packageConnectionId: z.string().uuid(),
        teamMemberId: z.string().uuid(),
    })),
});
//chat schema
export const chatSessionPostSchema = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(10),
});
export const chatSessionGetSchema = z.object({
    sessionId: z.string().uuid(),
});
