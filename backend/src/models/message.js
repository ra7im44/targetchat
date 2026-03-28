module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define('Message', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    chatId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    sender: { type: DataTypes.ENUM('user', 'ai'), allowNull: false },
    type: {
      type: DataTypes.ENUM('text', 'image', 'audio', 'video', 'file'),
      defaultValue: 'text',
      allowNull: false
    },
    text: { type: DataTypes.TEXT, allowNull: false },
    externalId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      field: 'external_id'
    },
    metadata: { type: DataTypes.JSON, allowNull: true }
  }, {
    tableName: 'messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Message;
};
