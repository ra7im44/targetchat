module.exports = (sequelize, DataTypes) => {
  const Chat = sequelize.define('Chat', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    persona: {
      type: DataTypes.STRING,
      defaultValue: 'default'
    },
    workflowId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'workflow_id'
    },
    workspace_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    leadId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'lead_id'
    },
    isHumanHandled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_human_handled'
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'assigned_to'
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'assigned_at'
    },
    aiPaused: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'ai_paused'
    },
    widgetId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'widget_id'
    },
    channelId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'channels',
        key: 'id'
      },
      field: 'channel_id'
    },
    status: {
      type: DataTypes.ENUM('active', 'closed'),
      defaultValue: 'active'
    },
    routingType: {
      type: DataTypes.STRING,
      defaultValue: 'ai',
      field: 'routing_type'
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: []
    }
  }, {
    tableName: 'chats',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Chat;
};
