module.exports = (sequelize, DataTypes) => {
    const WorkflowUser = sequelize.define('WorkflowUser', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        workflowId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'workflow_id'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        assignedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'assigned_at'
        },
        assignedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'assigned_by'
        }
    }, {
        tableName: 'workflow_users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    return WorkflowUser;
};
