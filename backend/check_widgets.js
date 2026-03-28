const { Widget } = require('./src/models');

async function checkWidgets() {
    try {
        const widgets = await Widget.findAll();
        console.log('Total Widgets:', widgets.length);
        widgets.forEach(w => {
            console.log(`ID: ${w.id}, Name: ${w.name}, Slug: ${w.slug}, Status: ${w.status}`);
        });

        if (widgets.length === 0) {
            console.log('Creating default widget...');
            const w = await Widget.create({
                name: 'Beta Test Widget',
                slug: 'beta-test',
                status: 'active',
                settings: {},
                theme: { primaryColor: '#2563eb' }
            });
            console.log(`Created Widget: ${w.id} (slug: ${w.slug})`);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

checkWidgets();
