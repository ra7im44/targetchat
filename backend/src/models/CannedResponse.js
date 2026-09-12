module.exports = (sequelize, DataTypes) => {
  const CannedResponse = sequelize.define('CannedResponse', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    shortcut: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id'
    },
    workspaceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'workspace_id'
    },
    isShared: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_shared'
    }
  }, {
    tableName: 'canned_responses',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return CannedResponse;
};
