export const topics = {
    authLogs: process.env.MESSAGING_TOP_AUDIT_LOGS || 'dev.integration.audit.logs.v1',
    userData: process.env.MESSAGING_TOP_USER_DATA || 'dev.integration.user.data.v1',
}
