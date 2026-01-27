import { WhitelistedUser, SupportUser } from '../models/Support';
import { IWhitelistedUser, ISupportUser, ISupportUserUpdateRequest } from '../interfaces';

export class SupportService {
    // --- Whitelisting Operations ---

    async whitelistUsers(users: { email: string }[], tenantId: string): Promise<IWhitelistedUser[]> {
        const operations = users.map(user => ({
            updateOne: {
                filter: { email: user.email.toLowerCase(), tenantId },
                update: { $set: { email: user.email.toLowerCase(), tenantId } },
                upsert: true,
            },
        }));

        await WhitelistedUser.bulkWrite(operations);
        return WhitelistedUser.find({ email: { $in: users.map(u => u.email.toLowerCase()) }, tenantId });
    }

    async getAllWhitelistedUsers(tenantId: string): Promise<IWhitelistedUser[]> {
        return WhitelistedUser.find({ tenantId });
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
