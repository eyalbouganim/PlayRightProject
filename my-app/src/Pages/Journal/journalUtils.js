export const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const generateHeatmapFromPerformances = (performances) => {
    const today = new Date();
    const data = [];
    const dateMap = new Map();

    performances.forEach(perf => {
        const date = new Date(perf.createdAt).toDateString();
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    for (let i = 111; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const count = dateMap.get(date.toDateString()) || 0;
        let intensity = 0;
        if (count === 1) intensity = 1;
        else if (count === 2) intensity = 2;
        else if (count === 3) intensity = 3;
        else if (count >= 4) intensity = 4;
        data.push({ date: date.toDateString(), intensity, count });
    }

    return data;
};

export const calculateStreak = (performances) => {
    if (!performances.length) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const practiceDays = new Set(
        performances.map(p => {
            const d = new Date(p.createdAt);
            d.setHours(0, 0, 0, 0);
            return d.getTime();
        })
    );

    let streak = 0;
    let checkDate = new Date(today);

    if (!practiceDays.has(checkDate.getTime())) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    while (practiceDays.has(checkDate.getTime())) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
};