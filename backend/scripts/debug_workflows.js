const { Workflow } = require('../src/models');
require('dotenv').config();

async function checkWorkflows() {
    try {
        const workflows = await Workflow.findAll();
        console.log('--- Current Workflows ---');
        workflows.forEach(w => {
            console.log(`ID: ${w.id}, Name: ${w.name}, UserID: ${w.userId}, IsPublic: ${w.isPublic}, IsActive: ${w.isActive}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

checkWorkflows();
