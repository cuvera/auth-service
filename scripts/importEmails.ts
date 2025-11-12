import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ImportedUser from '../src/models/ImportedUser';

// Load environment variables from .env file
dotenv.config();

// Configuration
const CONFIG = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/auth-service',
    TENANT_ID: process.env.TENANT_ID || 'default',
    ALLOWED_EMAILS: process.env.ALLOWED_EMAILS || '',
    BATCH_SIZE: 100,
};

async function connectDB() {
    try {
        await mongoose.connect(CONFIG.MONGODB_URI);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

function parseEmails(emailString: string): string[] {
    return emailString
        .split(',')
        .map(email => email.trim())
        .filter(email => {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            if (!isValid) {
                console.warn(`Skipping invalid email: ${email}`);
            }
            return isValid;
        });
}

async function importEmails() {
    try {
        if (!CONFIG.ALLOWED_EMAILS) {
            throw new Error('ALLOWED_EMAILS environment variable is not set');
        }

        // Parse emails from environment variable
        const emails = parseEmails(CONFIG.ALLOWED_EMAILS);

        if (emails.length === 0) {
            throw new Error('No valid email addresses found in ALLOWED_EMAILS');
        }

        console.log(`Found ${emails.length} valid emails to import`);

        // Process emails in batches
        for (let i = 0; i < emails.length; i += CONFIG.BATCH_SIZE) {
            const batch = emails.slice(i, i + CONFIG.BATCH_SIZE);
            const operations = batch.map(email => ({
                updateOne: {
                    filter: { email: email.toLowerCase(), tenantId: CONFIG.TENANT_ID },
                    update: {
                        $setOnInsert: {
                            email: email.toLowerCase(),
                            tenantId: CONFIG.TENANT_ID,
                        },
                    },
                    upsert: true,
                },
            }));

            const result = await ImportedUser.bulkWrite(operations, { ordered: false });

            console.log(`Processed batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}:`);
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
    await importEmails();
})();
