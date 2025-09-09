const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('?? Starting database seed...');

    // Seed users
    console.log('?? Seeding users...');

    const users = [
        { userId: '1067718939', username: 'Light62315', lastApiTrigger: BigInt(1754492659), active: true },
        { userId: '1239772110', username: 'k_zsy', lastApiTrigger: BigInt(0), active: true },
        { userId: '1334882939', username: 'Gerasim_Tur', lastApiTrigger: BigInt(1754507736), active: true },
        { userId: '1652887778', username: 'Albert09864', lastApiTrigger: BigInt(1753817643), active: true },
        { userId: '381311220', username: 'xomaxs', lastApiTrigger: BigInt(1754592255), active: true },
        { userId: '483739385', username: 'ey4ar', lastApiTrigger: BigInt(1754583799), active: true },
        { userId: '5114343631', username: 'grootlend', lastApiTrigger: BigInt(1753815351), active: true },
        { userId: '513950472', username: 'Munakuso', lastApiTrigger: BigInt(1753890819), active: true },
        { userId: '5319142494', username: 'BigDenbet', lastApiTrigger: BigInt(1753906849), active: true },
        { userId: '587385452', username: 'Benik66', lastApiTrigger: BigInt(0), active: true },
        { userId: '5904478982', username: 'Soloveybla', lastApiTrigger: BigInt(1754664716), active: true },
        { userId: '5921294795', username: 'sniperscam', lastApiTrigger: BigInt(1754080176), active: true },
        { userId: '6336412244', username: 'MAGNAT708', lastApiTrigger: BigInt(0), active: true },
        { userId: '6500123861', username: 'Laibl', lastApiTrigger: BigInt(1754574160), active: true },
        { userId: '689126467', username: 'skladaniuk', lastApiTrigger: BigInt(0), active: true },
        { userId: '7072885176', username: 'jentlmen_udachi', lastApiTrigger: BigInt(1754062274), active: true },
        { userId: '753231762', username: 'Ru_b_con', lastApiTrigger: BigInt(0), active: true },
        { userId: '842276872', username: 'TAURUS2211', lastApiTrigger: BigInt(1754659649), active: true },
        { userId: '931065143', username: 'miaksik52', lastApiTrigger: BigInt(1753995967), active: true },
        { userId: '998142601', username: 'Railwayuser17', lastApiTrigger: BigInt(1754585205), active: true },
        { userId: '551169253', username: 'angelasmir', lastApiTrigger: BigInt(1713897108), active: true }, // добавлен пользователь из INSERT
    ];

    for (const userData of users) {
        try {
            const user = await prisma.user.upsert({
                where: { userId: userData.userId },
                update: {
                    username: userData.username,
                    lastApiTrigger: userData.lastApiTrigger,
                    active: userData.active,
                },
                create: {
                    userId: userData.userId,
                    username: userData.username,
                    lastApiTrigger: userData.lastApiTrigger,
                    active: userData.active,
                },
            });
            console.log(`? User created/updated: ${user.username} (${user.userId})`);
        } catch (error) {
            console.error(`? Failed to create user ${userData.username}:`, error);
        }
    }

    // Seed chats
    console.log('?? Seeding chats...');

    const chats = [
        { chatId: '-4938915184', chatName: 'TEST GROUP', userId: '381311220', active: true },
        { chatId: '1067718939', chatName: 'Private messages', userId: '1067718939', active: true },
        { chatId: '1239772110', chatName: 'Private messages', userId: '1239772110', active: true },
        { chatId: '1334882939', chatName: 'Private messages', userId: '1334882939', active: true },
        { chatId: '1652887778', chatName: 'Private messages', userId: '1652887778', active: true },
        { chatId: '381311220', chatName: 'Private messages', userId: '381311220', active: true },
        { chatId: '483739385', chatName: 'Private messages', userId: '483739385', active: true },
        { chatId: '5114343631', chatName: 'Private messages', userId: '5114343631', active: true },
        { chatId: '513950472', chatName: 'Private messages', userId: '513950472', active: true },
        { chatId: '5319142494', chatName: 'Private messages', userId: '5319142494', active: true },
        { chatId: '587385452', chatName: 'Private messages', userId: '587385452', active: true },
        { chatId: '5904478982', chatName: 'Private messages', userId: '5904478982', active: true },
        { chatId: '5921294795', chatName: 'Private messages', userId: '5921294795', active: true },
        { chatId: '6336412244', chatName: 'Private messages', userId: '6336412244', active: true },
        { chatId: '6500123861', chatName: 'Private messages', userId: '6500123861', active: true },
        { chatId: '689126467', chatName: 'Private messages', userId: '689126467', active: false },
        { chatId: '7072885176', chatName: 'Private messages', userId: '7072885176', active: true },
        { chatId: '753231762', chatName: 'Private messages', userId: '753231762', active: true },
        { chatId: '842276872', chatName: 'Private messages', userId: '842276872', active: true },
        { chatId: '931065143', chatName: 'Private messages', userId: '931065143', active: true },
        { chatId: '998142601', chatName: 'Private messages', userId: '998142601', active: true },
        { chatId: '551169253', chatName: 'Private messages', userId: '551169253', active: true }, // добавлен чат для пользователя из INSERT
    ];

    for (const chatData of chats) {
        try {
            const chat = await prisma.chat.upsert({
                where: { chatId: chatData.chatId },
                update: {
                    chatName: chatData.chatName,
                    userId: chatData.userId,
                    active: chatData.active,
                },
                create: {
                    chatId: chatData.chatId,
                    chatName: chatData.chatName,
                    userId: chatData.userId,
                    active: chatData.active,
                },
            });
            console.log(`? Chat created/updated: ${chat.chatName} (${chat.chatId}) for user ${chat.userId}`);
        } catch (error) {
            console.error(`? Failed to create chat ${chatData.chatId}:`, error);
        }
    }

    // Seed pending users (example data)
    console.log('? Seeding pending users...');

    const pendingUsers = [
        { username: 'pending_user_1' },
        { username: 'pending_user_2' },
        { username: 'pending_user_3' },
    ];

    for (const pendingUserData of pendingUsers) {
        try {
            const pendingUser = await prisma.pendingUser.create({
                data: {
                    username: pendingUserData.username,
                },
            });
            console.log(`? Pending user created: ${pendingUser.username} (ID: ${pendingUser.id})`);
        } catch (error) {
            console.error(`? Failed to create pending user ${pendingUserData.username}:`, error);
        }
    }

    // Seed goal await notifications (example data)
    console.log('?? Seeding goal await notifications...');

    const goalAwaitNotifications = [
        { chatId: '381311220', matchId: 12345, messageId: 'msg_001' },
        { chatId: '483739385', matchId: 12346, messageId: 'msg_002' },
        { chatId: '551169253', matchId: 12347, messageId: 'msg_003' },
    ];

    for (const notificationData of goalAwaitNotifications) {
        try {
            const notification = await prisma.goalAwaitNotification.create({
                data: {
                    chatId: notificationData.chatId,
                    matchId: notificationData.matchId,
                    messageId: notificationData.messageId,
                },
            });
            console.log(`? Goal await notification created: ID ${notification.id} for chat ${notification.chatId}`);
        } catch (error) {
            console.error(`? Failed to create goal await notification for chat ${notificationData.chatId}:`, error);
        }
    }

    // Seed admin
    console.log('?? Seeding admin...');

    try {
        const admin = await prisma.admin.upsert({
            where: { login: 'admin' },
            update: {
                userPassword: 'admin',
            },
            create: {
		id: 1
                login: 'admin',
                userPassword: 'admin',
            },
        });
        console.log(`? Admin created/updated: ${admin.login}`);
    } catch (error) {
        console.error('? Failed to create admin:', error);
    }

    // Seed stats (example data)
    console.log('?? Seeding stats...');

    const stats = [
        {
            matchId: 12345,
            country: 'Spain',
            league: 'La Liga',
            startTime: '2025-08-10 20:00:00',
            homeTeam: 'Real Madrid',
            awayTeam: 'Barcelona',
            signalTime: '15:30',
            homeScore: 1,
            awayScore: 0,
            goalTime: '16:45',
            coefficient: 1.85,
            homeScoreAtEnd: 2,
            awayScoreAtEnd: 1,
            cornersAtSignal: 3,
            cornersAtEnd: 7,
            yellowcardsAtSignal: 1,
            yellowcardsAtEnd: 4,
            shotsOnTargetAtSignal: 2,
            shotsOnTargetAtEnd: 8,
            dangerousAttacksAtSignal: 15,
            dangerousAttacksAtEnd: 32,
            redcardsAtSignal: 0,
            redcardsAtEnd: 1,
        },
        {
            matchId: 12346,
            country: 'England',
            league: 'Premier League',
            startTime: '2025-08-10 18:30:00',
            homeTeam: 'Manchester United',
            awayTeam: 'Liverpool',
            signalTime: '22:15',
            homeScore: 0,
            awayScore: 1,
            goalTime: '25:30',
            coefficient: 2.1,
            homeScoreAtEnd: 1,
            awayScoreAtEnd: 3,
            cornersAtSignal: 2,
            cornersAtEnd: 9,
            yellowcardsAtSignal: 0,
            yellowcardsAtEnd: 3,
            shotsOnTargetAtSignal: 1,
            shotsOnTargetAtEnd: 6,
            dangerousAttacksAtSignal: 8,
            dangerousAttacksAtEnd: 28,
            redcardsAtSignal: 0,
            redcardsAtEnd: 0,
        },
    ];

    for (const statsData of stats) {
        try {
            const stat = await prisma.stats.upsert({
                where: { matchId: statsData.matchId },
                update: { ...statsData },
                create: { ...statsData },
            });
            console.log(`? Stats created/updated: Match ${stat.matchId} (${stat.homeTeam} vs ${stat.awayTeam})`);
        } catch (error) {
            console.error(`? Failed to create stats for match ${statsData.matchId}:`, error);
        }
    }

    console.log('?? Database seed completed!');

    // Print summary
    const userCount = await prisma.user.count();
    const pendingUserCount = await prisma.pendingUser.count();
    const chatCount = await prisma.chat.count();
    const goalAwaitNotificationCount = await prisma.goalAwaitNotification.count();
    const adminCount = await prisma.admin.count();
    const statsCount = await prisma.stats.count();

    console.log('\n?? Summary:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Pending Users: ${pendingUserCount}`);
    console.log(`   Chats: ${chatCount}`);
    console.log(`   Goal Await Notifications: ${goalAwaitNotificationCount}`);
    console.log(`   Admins: ${adminCount}`);
    console.log(`   Stats: ${statsCount}`);
}

main()
    .catch((e) => {
        console.error('?? Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });