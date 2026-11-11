module.exports = (sequelize, DataTypes) => {
  const KbChunk = sequelize.define('KbChunk', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    document_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'kb_documents', key: 'id' }
    },
    // Denormalised for fast, leak-proof workspace filters.
    workspace_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'workspaces', key: 'id' }
    },
    chunk_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    text: { type: DataTypes.TEXT, allowNull: false },
    token_count: { type: DataTypes.INTEGER, allowNull: true },
    // Null when no embedding model is installed; retrieval then uses lexical
    // ranking (see knowledgeService.search).
    embedding: { type: DataTypes.JSON, allowNull: true }
  }, {
    tableName: 'kb_chunks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true
  });
  return KbChunk;
};
