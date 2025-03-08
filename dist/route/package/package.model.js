import { Prisma, } from "@prisma/client";
import prisma from "../../utils/prisma.js";
export const packagePostModel = async (params) => {
    const { amount, packageId, teamMemberProfile, user } = params;
    console.log(teamMemberProfile);
    const [packageData, earningsData, referralData] = await Promise.all([
        prisma.package_table.findUnique({
            where: { package_id: packageId },
            select: {
                package_percentage: true,
                packages_days: true,
                package_is_disabled: true,
                package_name: true,
            },
        }),
        prisma.alliance_earnings_table.findUnique({
            where: {
                alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
            },
            select: {
                alliance_olympus_wallet: true,
                alliance_referral_bounty: true,
                alliance_olympus_earnings: true,
                alliance_combined_earnings: true,
            },
        }),
        prisma.alliance_referral_table.findFirst({
            where: {
                alliance_referral_member_id: teamMemberProfile.alliance_member_id,
            },
            select: { alliance_referral_hierarchy: true },
        }),
    ]);
    console.log(earningsData);
    if (!packageData) {
        throw new Error("Package not found.");
    }
    if (packageData.package_is_disabled) {
        throw new Error("Package is disabled.");
    }
    if (!earningsData) {
        throw new Error("Earnings record not found.");
    }
    const { alliance_olympus_wallet, alliance_olympus_earnings, alliance_referral_bounty, alliance_combined_earnings, } = earningsData;
    const combinedEarnings = Number(alliance_combined_earnings.toFixed(2));
    const requestedAmount = Number(amount.toFixed(2));
    if (combinedEarnings < requestedAmount) {
        throw new Error("Insufficient balance in the wallet.");
    }
    const { olympusWallet, olympusEarnings, referralWallet, updatedCombinedWallet, isReinvestment, isFromWallet, } = deductFromWallets(requestedAmount, combinedEarnings, Number(alliance_olympus_wallet), Number(alliance_olympus_earnings), Number(alliance_referral_bounty));
    const packagePercentage = new Prisma.Decimal(Number(packageData.package_percentage)).div(100);
    const packageAmountEarnings = new Prisma.Decimal(requestedAmount).mul(packagePercentage);
    // Generate referral chain with a capped depth
    const referralChain = generateReferralChain(referralData?.alliance_referral_hierarchy ?? null, teamMemberProfile.alliance_member_id, 100 // Cap the depth to 100 levels
    );
    let bountyLogs = [];
    let transactionLogs = [];
    let notificationLogs = [];
    const connectionData = await prisma.$transaction(async (tx) => {
        const connectionData = await tx.package_member_connection_table.create({
            data: {
                package_member_member_id: teamMemberProfile.alliance_member_id,
                package_member_package_id: packageId,
                package_member_amount: Number(requestedAmount.toFixed(2)),
                package_amount_earnings: Number(packageAmountEarnings.toFixed(2)),
                package_member_status: "ACTIVE",
                package_member_completion_date: new Date(Date.now() + packageData.packages_days * 24 * 60 * 60 * 1000),
                package_member_is_reinvestment: isReinvestment,
            },
        });
        await tx.alliance_transaction_table.create({
            data: {
                transaction_member_id: teamMemberProfile.alliance_member_id,
                transaction_amount: Number(requestedAmount.toFixed(2)),
                transaction_description: `Package Enrolled: ${packageData.package_name}`,
            },
        });
        await tx.alliance_earnings_table.update({
            where: {
                alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
            },
            data: {
                alliance_combined_earnings: updatedCombinedWallet,
                alliance_olympus_wallet: olympusWallet,
                alliance_olympus_earnings: olympusEarnings,
                alliance_referral_bounty: referralWallet,
            },
        });
        if (referralChain.length > 0) {
            const batchSize = 100;
            const limitedReferralChain = [];
            for (let i = 0; i < referralChain.length; i++) {
                if (referralChain[i].level > 10)
                    break;
                limitedReferralChain.push(referralChain[i]);
            }
            for (let i = 0; i < limitedReferralChain.length; i += batchSize) {
                const batch = limitedReferralChain.slice(i, i + batchSize);
                bountyLogs = batch.map((ref) => {
                    // Calculate earnings based on ref.percentage and round to the nearest integer
                    const calculatedEarnings = (Number(amount) * Number(ref.percentage)) / 100;
                    return {
                        package_ally_bounty_member_id: ref.referrerId,
                        package_ally_bounty_percentage: ref.percentage,
                        package_ally_bounty_earnings: calculatedEarnings,
                        package_ally_bounty_type: ref.level === 1 ? "DIRECT" : "INDIRECT",
                        package_ally_bounty_connection_id: connectionData.package_member_connection_id,
                        package_ally_bounty_from: teamMemberProfile.alliance_member_id,
                    };
                });
                transactionLogs = batch.map((ref) => {
                    const calculatedEarnings = (Number(amount) * Number(ref.percentage)) / 100;
                    return {
                        transaction_member_id: ref.referrerId,
                        transaction_amount: calculatedEarnings,
                        transaction_description: ref.level === 1
                            ? "Referral Income"
                            : `Network Income ${ref.level}${ref.level === 2 ? "nd" : ref.level === 3 ? "rd" : "th"} level`,
                    };
                });
                notificationLogs = batch.map((ref) => ({
                    alliance_notification_user_id: ref.referrerId,
                    alliance_notification_message: ref.level === 1
                        ? "Referral Income"
                        : `Network Income ${ref.level}${ref.level === 2 ? "nd" : ref.level === 3 ? "rd" : "th"} level`,
                }));
                await Promise.all(batch.map(async (ref) => {
                    if (!ref.referrerId)
                        return;
                    const calculatedEarnings = (Number(amount) * Number(ref.percentage)) / 100;
                    await tx.alliance_earnings_table.update({
                        where: { alliance_earnings_member_id: ref.referrerId },
                        data: {
                            alliance_referral_bounty: {
                                increment: calculatedEarnings,
                            },
                            alliance_combined_earnings: {
                                increment: calculatedEarnings,
                            },
                        },
                    });
                }));
            }
            if (bountyLogs.length > 0) {
                await tx.package_ally_bounty_log.createMany({ data: bountyLogs });
            }
            if (transactionLogs.length > 0) {
                await tx.alliance_transaction_table.createMany({
                    data: transactionLogs,
                });
            }
            if (notificationLogs.length > 0) {
                await tx.alliance_notification_table.createMany({
                    data: notificationLogs,
                });
            }
            if (!teamMemberProfile?.alliance_member_is_active) {
                await tx.alliance_member_table.update({
                    where: { alliance_member_id: teamMemberProfile.alliance_member_id },
                    data: {
                        alliance_member_is_active: true,
                        alliance_member_date_updated: new Date(),
                    },
                });
            }
        }
        return connectionData;
    });
    // if (isFromWallet) {
    //   const message = `${user.user_username} invested ₱ ${amount.toLocaleString(
    //     "en-US",
    //     {
    //       minimumFractionDigits: 2,
    //       maximumFractionDigits: 2,
    //     }
    //   )}: ${packageData.package_name} Package. Congratulations!`;
    //   try {
    //     await redis.publish("package-purchased", message);
    //   } catch (error) {
    //     console.error("Redis Error:", error);
    //   }
    // }
    return connectionData;
};
export const packageGetModel = async () => {
    const result = await prisma.$transaction(async (tx) => {
        const data = await tx.package_table.findMany({
            select: {
                package_id: true,
                package_name: true,
                package_percentage: true,
                package_description: true,
                packages_days: true,
                package_color: true,
                package_image: true,
            },
        });
        return data;
    });
    return result;
};
export const packageCreatePostModel = async (params) => {
    const { packageName, packageDescription, packagePercentage, packageDays, packageColor, packageImage, } = params;
    const checkIfPackageExists = await prisma.package_table.findFirst({
        where: { package_name: packageName },
    });
    if (checkIfPackageExists) {
        throw new Error("Package already exists.");
    }
    const parsedPackagePercentage = parseFloat(packagePercentage);
    const parsedPackageDays = parseInt(packageDays, 10);
    if (isNaN(parsedPackagePercentage) || isNaN(parsedPackageDays)) {
        throw new Error("Invalid number format for packagePercentage or packageDays.");
    }
    const result = await prisma.$transaction([
        prisma.package_table.create({
            data: {
                package_name: packageName,
                package_description: packageDescription,
                package_percentage: parsedPackagePercentage,
                packages_days: parsedPackageDays,
                package_color: packageColor ?? "#000000",
                package_image: packageImage,
            },
        }),
    ]);
    return result;
};
export const packageUpdatePutModel = async (params) => {
    const { packageName, packageDescription, packagePercentage, packageIsDisabled, packageDays, packageColor, packageId, packageImage, } = params;
    const updatedPackage = await prisma.$transaction(async (tx) => {
        return await tx.package_table.update({
            where: { package_id: packageId },
            data: {
                package_name: packageName,
                package_description: packageDescription,
                package_percentage: parseFloat(packagePercentage),
                packages_days: parseInt(packageDays),
                package_is_disabled: packageIsDisabled,
                package_color: packageColor ? packageColor : undefined,
                package_image: packageImage ? packageImage : undefined,
            },
        });
    });
    return updatedPackage;
};
export const claimPackagePostModel = async (params) => {
    const currentTimestamp = new Date();
    const { amount, earnings, packageConnectionId, teamMemberProfile } = params;
    await prisma.$transaction(async (tx) => {
        const packageConnection = await tx.package_member_connection_table.findUnique({
            where: { package_member_connection_id: packageConnectionId },
        });
        if (!packageConnection) {
            throw new Error("Invalid request.");
        }
        const startDate = new Date(packageConnection.package_member_connection_created);
        const completionDate = packageConnection.package_member_completion_date
            ? new Date(packageConnection.package_member_completion_date)
            : null;
        const elapsedTimeMs = Math.max(currentTimestamp.getTime() - startDate.getTime(), 0);
        const totalTimeMs = completionDate
            ? Math.max(completionDate.getTime() - startDate.getTime(), 0)
            : 0;
        let percentage = totalTimeMs > 0 ? (elapsedTimeMs / totalTimeMs) * 100 : 100;
        percentage = Math.min(percentage, 100);
        const packageDetails = await tx.package_table.findUnique({
            where: {
                package_id: packageConnection.package_member_package_id,
            },
            select: {
                package_name: true,
            },
        });
        if (!packageDetails) {
            throw new Error("Invalid request.");
        }
        if (!packageConnection.package_member_is_ready_to_claim ||
            percentage !== 100) {
            throw new Error("Invalid request. Package is not ready to claim.");
        }
        if (packageConnection.package_member_status === "ENDED") {
            throw new Error("Invalid request. Package is already ended.");
        }
        const totalClaimedAmount = packageConnection.package_member_amount +
            packageConnection.package_amount_earnings;
        const totalAmountToBeClaimed = amount + earnings;
        if (totalClaimedAmount !== totalAmountToBeClaimed) {
            throw new Error("Invalid request");
        }
        await tx.package_member_connection_table.update({
            where: { package_member_connection_id: packageConnectionId },
            data: {
                package_member_status: "ENDED",
                package_member_is_ready_to_claim: false,
            },
        });
        await tx.alliance_earnings_table.update({
            where: {
                alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
            },
            data: {
                alliance_olympus_earnings: { increment: totalClaimedAmount },
                alliance_combined_earnings: { increment: totalClaimedAmount },
            },
        });
        await tx.alliance_transaction_table.create({
            data: {
                transaction_member_id: teamMemberProfile.alliance_member_id,
                transaction_amount: totalClaimedAmount,
                transaction_description: ` ${packageDetails.package_name} Package Claimed`,
            },
        });
        await tx.package_earnings_log.create({
            data: {
                package_member_connection_id: packageConnectionId,
                package_member_package_id: packageConnection.package_member_package_id,
                package_member_member_id: teamMemberProfile.alliance_member_id,
                package_member_connection_created: packageConnection.package_member_connection_created,
                package_member_amount: packageConnection.package_member_amount,
                package_member_amount_earnings: earnings,
                package_member_status: "ENDED",
            },
        });
    });
};
export const packageListGetModel = async (params) => {
    const { teamMemberProfile } = params;
    const currentTimestamp = new Date();
    const chartData = await prisma.package_member_connection_table.findMany({
        where: {
            package_member_status: "ACTIVE",
            package_member_member_id: teamMemberProfile.alliance_member_id,
        },
        orderBy: {
            package_member_connection_created: "desc",
        },
        include: {
            package_table: {
                select: {
                    package_name: true,
                    package_color: true,
                    packages_days: true,
                    package_percentage: true,
                    package_image: true,
                },
            },
        },
    });
    const processedData = await Promise.all(chartData.map(async (row) => {
        const startDate = new Date(row.package_member_connection_created);
        const completionDate = row.package_member_completion_date
            ? new Date(row.package_member_completion_date)
            : null;
        const elapsedTimeMs = Math.max(currentTimestamp.getTime() - startDate.getTime(), 0);
        const totalTimeMs = completionDate
            ? Math.max(completionDate.getTime() - startDate.getTime(), 0)
            : 0;
        let percentage = totalTimeMs > 0 ? (elapsedTimeMs / totalTimeMs) * 100 : 100;
        percentage = Math.min(percentage, 100);
        // Calculate current amount
        const initialAmount = row.package_member_amount;
        const profitAmount = row.package_amount_earnings;
        const currentAmount = initialAmount + (profitAmount * percentage) / 100;
        if (percentage === 100 && !row.package_member_is_ready_to_claim) {
            await prisma.package_member_connection_table.update({
                where: {
                    package_member_connection_id: row.package_member_connection_id,
                },
                data: { package_member_is_ready_to_claim: true },
            });
        }
        return {
            package: row.package_table.package_name,
            package_color: row.package_table.package_color || "#FFFFFF",
            completion_date: completionDate?.toISOString(),
            amount: Number(row.package_member_amount.toFixed(2)),
            completion: Number(percentage.toFixed(2)),
            package_date_created: row.package_member_connection_created,
            package_connection_id: row.package_member_connection_id,
            profit_amount: Number(row.package_amount_earnings.toFixed(2)),
            current_amount: Number(currentAmount.toFixed(2)),
            is_ready_to_claim: percentage === 100,
        };
    }));
    return processedData;
};
export const packageListGetAdminModel = async () => {
    const result = await prisma.package_table.findMany({
        select: {
            package_id: true,
            package_name: true,
            package_percentage: true,
            package_description: true,
            packages_days: true,
            package_color: true,
            package_image: true,
        },
    });
    return result;
};
function generateReferralChain(hierarchy, teamMemberId, maxDepth = 100) {
    if (!hierarchy)
        return [];
    const hierarchyArray = hierarchy.split(".");
    const currentIndex = hierarchyArray.indexOf(teamMemberId);
    if (currentIndex === -1) {
        throw new Error("Current member ID not found in the hierarchy.");
    }
    return hierarchyArray
        .slice(0, currentIndex)
        .reverse()
        .slice(0, maxDepth)
        .map((referrerId, index) => ({
        referrerId: referrerId.trim().replace(/[\r\n]+/g, ""),
        percentage: getBonusPercentage(index + 1),
        level: index + 1,
    }));
}
function getBonusPercentage(level) {
    const bonusMap = {
        1: 10,
        2: 1.5,
        3: 1.5,
        4: 1.5,
        5: 1,
        6: 1,
        7: 1,
        8: 1,
        9: 1,
        10: 1,
    };
    return bonusMap[level] || 0;
}
function deductFromWallets(amount, combinedWallet, olympusWallet, olympusEarnings, referralWallet) {
    let remaining = amount;
    let isReinvestment = false;
    let isFromWallet = false;
    // Validate total funds
    if (combinedWallet < amount) {
        throw new Error("Insufficient balance in combined wallet.");
    }
    // Deduct from Olympus Wallet first
    if (olympusWallet >= remaining) {
        olympusWallet -= remaining;
        remaining = 0;
        isFromWallet = true;
    }
    else {
        isFromWallet = false;
        remaining -= olympusWallet;
        olympusWallet = 0;
    }
    // Deduct from Olympus Earnings next
    if (remaining > 0) {
        if (olympusEarnings >= remaining) {
            isReinvestment = true;
            olympusEarnings -= remaining;
            remaining = 0;
        }
        else {
            remaining -= olympusEarnings;
            isReinvestment = true;
            olympusEarnings = 0;
        }
    }
    // Deduct from Referral Wallet
    if (remaining > 0) {
        if (referralWallet >= remaining) {
            referralWallet -= remaining;
            remaining = 0;
        }
        else {
            remaining -= referralWallet;
            referralWallet = 0;
        }
    }
    // If any balance remains, throw an error
    if (remaining > 0) {
        throw new Error("Insufficient funds to complete the transaction.");
    }
    // Return updated balances and remaining combined wallet
    return {
        olympusWallet,
        isFromWallet,
        olympusEarnings,
        referralWallet,
        isReinvestment,
        updatedCombinedWallet: combinedWallet - amount,
    };
}
