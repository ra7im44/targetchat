module.exports = (sequelize, DataTypes) => {
  const KbDocument = sequelize.define('KbDocument', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    workspace_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'workspaces', key: 'id' }
    },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    filename: { type: DataTypes.STRING(255), allowNull: false },
    mime_type: { type: DataTypes.STRING(120), allowNull: true },
    size_bytes: { type: DataTypes.INTEGER, allowNull: true },
    checksum: { type: DataTypes.STRING(64), allowNull: true },
    status: {
      type: DataTypes.ENUM('processing', 'ready', 'failed'),
      allowNull: false,
      defaultValue: 'processing'
    },
    error: { type: DataTypes.STRING(500), allowNull: true },
    chunk_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    embedding_model: { type: DataTypes.STRING(120), allowNull: true }
  }, {
    tableName: 'kb_documents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: true
  });
  return KbDocument;
};
