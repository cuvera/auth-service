import { WhitelistedUser, SupportUser } from '../models/Support';
import { IWhitelistedUser, ISupportUser, ISupportUserUpdateRequest } from '../interfaces';

export class SupportService {
    // --- Whitelisting Operations ---

    async whitelistUsers(users: { email: string }[], tenantId: string): Promise<IWhitelistedUser[]> {


        // Check for existing emails
        const emailsToCheck = users.map(u => u.email.toLowerCase());
        const existingUsers = await WhitelistedUser.find({
            email: { $in: emailsToCheck },
            tenantId
        });

        if (existingUsers.length > 0) {
            const duplicateEmails = existingUsers.map(u => u.email).join(', ');
            const errorMessage = existingUsers.length === 1
                ? `Email already whitelisted: ${duplicateEmails}`
                : `Emails already whitelisted: ${duplicateEmails}`;


            const AppError = require('../utils/appError').AppError;
            throw new AppError(errorMessage, 400);
        }

        // Insert new users
        const operations = users.map(user => ({
            insertOne: {
                document: { email: user.email.toLowerCase(), tenantId }
            },
        }));

        try {
            await WhitelistedUser.bulkWrite(operations);
            const results = await WhitelistedUser.find({ email: { $in: emailsToCheck }, tenantId });

            return results;
        } catch (error) {
            console.error('[SUPPORT_SERVICE] Error during bulkWrite/find whitelisting:', error);
            throw error;
        }
    }

    async getAllWhitelistedUsers(tenantId: string, page: number = 1, limit: number = 10): Promise<{ users: IWhitelistedUser[]; totalCount: number; totalPages: number }> {

        const skip = (page - 1) * limit;
        try {
            const [users, totalCount] = await Promise.all([
                WhitelistedUser.find({ tenantId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
                WhitelistedUser.countDocuments({ tenantId }),
            ]);

            return {
                users,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            };
        } catch (error) {
            console.error('[SUPPORT_SERVICE] Error fetching whitelisted users:', error);
            throw error;
        }
    }

    async updateWhitelistedUserEmail(oldEmail: string, newEmail: string, tenantId: string): Promise<IWhitelistedUser | null> {
        return WhitelistedUser.findOneAndUpdate(
            { email: oldEmail.toLowerCase(), tenantId },
            { email: newEmail.toLowerCase() },
            { new: true, runValidators: true }
        );
    }

    async deleteWhitelistedUserByEmail(email: string, tenantId: string): Promise<IWhitelistedUser | null> {
        return WhitelistedUser.findOneAndDelete({ email: email.toLowerCase(), tenantId });
    }

    // --- User Operations (using SupportUser model) ---

    private readonly FIELD_EXCLUSION = '-password -googleId -avatar -provider';

    async getUsers(tenantId: string): Promise<ISupportUser[]> {
        return SupportUser.find({ tenantId }).select(this.FIELD_EXCLUSION);
    }

    async getUserById(id: string): Promise<ISupportUser | null> {
        return SupportUser.findById(id).select(this.FIELD_EXCLUSION);
    }

    async getUserByName(name: string, tenantId: string): Promise<ISupportUser[]> {
        return SupportUser.find({
            name: { $regex: name, $options: 'i' },
            tenantId
        }).select(this.FIELD_EXCLUSION);
    }

    async getUserByQuery(query: any): Promise<ISupportUser | null> {
        return SupportUser.findOne(query).select(this.FIELD_EXCLUSION);
    }

    async updateUser(id: string, updateData: ISupportUserUpdateRequest): Promise<ISupportUser | null> {
        return SupportUser.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).select(this.FIELD_EXCLUSION);
    }

    // Deprecated/Compatibility methods if needed
    async deleteImportedUserByEmail(email: string, tenantId: string) { return this.deleteWhitelistedUserByEmail(email, tenantId); }
    async updateImportedUserByEmail(oldEmail: string, newEmail: string, tenantId: string) { return this.updateWhitelistedUserEmail(oldEmail, newEmail, tenantId); }
}

export default new SupportService();
