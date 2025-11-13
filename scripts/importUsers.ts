import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import ImportedUser from '../src/models/ImportedUser';

// Load environment variables
dotenv.config();

// Types
interface UserImport {
    email: string;
}

// Configuration
const CONFIG = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-service',
    TENANT_ID: process.env.TENANT_ID || 'default',
    INPUT_FILE: '../../../Downloads/cuvera-ingestion.employee2.json',
    BATCH_SIZE: 100, // Number of users to process in a single batch
};
console.log("CONFIG", CONFIG)

async function connectDB() {
    try {
        await mongoose.connect(CONFIG.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

async function importUsers() {
    try {
        // Read and parse the input file
        const filePath = path.resolve(process.cwd(), CONFIG.INPUT_FILE);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const users: UserImport[] = JSON.parse(fileContent);

        if (!Array.isArray(users)) {
            throw new Error('Input file must contain an array of user objects');
        }

        console.log(`Found ${users.length} users to import`);

        // Process users in batches
        for (let i = 0; i < users.length; i += CONFIG.BATCH_SIZE) {
            const batch = users.slice(i, i + CONFIG.BATCH_SIZE);

            // Prepare operations for bulk write
            const operations = batch.map(user => ({
                updateOne: {
                    filter: { email: user.email.toLowerCase(), tenantId: CONFIG.TENANT_ID },
                    update: {
                        $setOnInsert: {
                            email: user.email.toLowerCase(),
                            tenantId: CONFIG.TENANT_ID,
                        },
                    },
                    upsert: true,
                },
            }));

            // Execute bulk write
            const result = await ImportedUser.bulkWrite(operations, { ordered: false });

            console.log(`Processed batch ${i / CONFIG.BATCH_SIZE + 1}:`);
            console.log(`- Inserted: ${result.upsertedCount}`);
            console.log(`- Updated: ${result.modifiedCount}`);
        }

        console.log('Import completed successfully');
    } catch (error) {
        console.error('Error during import:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

// Run the import
(async () => {
    await connectDB();
    await importUsers();
})();
