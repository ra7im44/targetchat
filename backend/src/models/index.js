const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = require('./user')(sequelize, DataTypes);
const Chat = require('./chat')(sequelize, DataTypes);
const Message = require('./message')(sequelize, DataTypes);
const Setting = require('./Setting')(sequelize, DataTypes);
const Workflow = require('./Workflow')(sequelize, DataTypes);
const ApiToken = require('./ApiToken')(sequelize, DataTypes);
const UserPreference = require('./UserPreference')(sequelize, DataTypes);
const WorkflowUser = require('./WorkflowUser')(sequelize, DataTypes);

const ActivityLog = require('./ActivityLog')(sequelize, DataTypes);
const Channel = require('./Channel')(sequelize, DataTypes);

// Email system models
const EmailTemplate = require('./EmailTemplate')(sequelize, DataTypes);
const EmailLog = require('./EmailLog')(sequelize, DataTypes);
const EmailPreference = require('./EmailPreference')(sequelize, DataTypes);

// Billing models
const SubscriptionPlan = require('./SubscriptionPlan')(sequelize, DataTypes);
const Subscription = require('./Subscription')(sequelize, DataTypes);
const Invoice = require('./Invoice')(sequelize, DataTypes);
const BillingEvent = require('./BillingEvent')(sequelize, DataTypes);
const Coupon = require('./Coupon')(sequelize, DataTypes);
const BlockedIP = require('./BlockedIP')(sequelize, DataTypes);
const BillingLog = require('./BillingLog')(sequelize, DataTypes);

// Workspace models
const Workspace = require('./Workspace');
const WorkspaceMember = require('./WorkspaceMember');
const WorkspaceInvitation = require('./WorkspaceInvitation');
const Widget = require('./Widget');
const Lead = require('./Lead');
const WidgetAssignee = require('./WidgetAssignee');
const ChatEvent = require('./ChatEvent');
const ChatNote = require('./ChatNote');

User.hasMany(Chat, { foreignKey: 'userId' });
Chat.belongsTo(User, { foreignKey: 'userId' });

Chat.hasMany(Message, { foreignKey: 'chatId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Chat, { foreignKey: 'chatId', as: 'chat' });

User.hasMany(Message, { foreignKey: 'userId' });
Message.belongsTo(User, { foreignKey: 'userId' });

// Workflow associations
Workflow.hasMany(Chat, { foreignKey: 'workflowId', as: 'chats' });
Chat.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' });

User.hasMany(Workflow, { foreignKey: 'userId', as: 'ownedWorkflows' });
Workflow.belongsTo(User, { foreignKey: 'userId', as: 'owner' });

// ApiToken associations
User.hasMany(ApiToken, { foreignKey: 'userId', as: 'apiTokens' });
ApiToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ActivityLog associations
User.hasMany(ActivityLog, { foreignKey: 'user_id', as: 'activityLogs' });
ActivityLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// UserPreference associations
User.hasOne(UserPreference, { foreignKey: 'userId', as: 'preferences' });
UserPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// WorkflowUser associations (Many-to-Many: Workflow <-> User)
Workflow.belongsToMany(User, {
    through: WorkflowUser,
    as: 'assignedUsers',
    foreignKey: 'workflowId',
    otherKey: 'userId'
});

User.belongsToMany(Workflow, {
    through: WorkflowUser,
    as: 'assignedWorkflows',
    foreignKey: 'userId',
    otherKey: 'workflowId'
});

// Billing associations
User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

SubscriptionPlan.hasMany(Subscription, { foreignKey: 'planId', as: 'subscriptions' });
Subscription.belongsTo(SubscriptionPlan, { foreignKey: 'planId', as: 'plan' });

User.hasMany(Invoice, { foreignKey: 'userId', as: 'invoices' });
Invoice.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Subscription.hasMany(Invoice, { foreignKey: 'subscriptionId', as: 'invoices' });
Invoice.belongsTo(Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });

User.hasMany(BillingEvent, { foreignKey: 'userId', as: 'billingEvents' });
BillingEvent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(EmailLog, { foreignKey: 'userId', as: 'emailLogs' });
EmailLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Email system associations
EmailTemplate.hasMany(EmailLog, { foreignKey: 'templateId', as: 'logs' });
EmailLog.belongsTo(EmailTemplate, { foreignKey: 'templateId', as: 'template' });

User.hasMany(EmailPreference, { foreignKey: 'userId', as: 'emailPreferences' });
EmailPreference.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// BillingLog associations
User.hasMany(BillingLog, { foreignKey: 'user_id', as: 'billingLogs' });
BillingLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Workspace.hasMany(BillingLog, { foreignKey: 'workspace_id', as: 'billingLogs' });
BillingLog.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

// Workspace associations
Workspace.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(Workspace, { foreignKey: 'owner_id', as: 'ownedWorkspaces' });

Workspace.hasMany(WorkspaceMember, { foreignKey: 'workspace_id', as: 'members' });
WorkspaceMember.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

User.hasMany(WorkspaceMember, { foreignKey: 'user_id', as: 'workspaceMemberships' });
WorkspaceMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Workspace.hasMany(WorkspaceInvitation, { foreignKey: 'workspace_id', as: 'invitations' });
WorkspaceInvitation.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

// Widget associations
User.hasMany(Widget, { foreignKey: 'user_id', as: 'widgets' });
Widget.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Workspace.hasMany(Widget, { foreignKey: 'workspace_id', as: 'widgets' });
Widget.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

// Lead associations
User.hasMany(Lead, { foreignKey: 'owner_user_id', as: 'leads' });
Lead.belongsTo(User, { foreignKey: 'owner_user_id', as: 'owner' });

Chat.belongsTo(Lead, { foreignKey: 'lead_id', as: 'lead' });
Lead.hasMany(Chat, { foreignKey: 'lead_id', as: 'chats' });

// WidgetAssignee associations
User.hasMany(WidgetAssignee, { foreignKey: 'user_id', as: 'widgetAssignments' });
WidgetAssignee.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ChatEvent associations
Chat.hasMany(ChatEvent, { foreignKey: 'chat_id', as: 'events' });
ChatEvent.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });

User.hasMany(ChatEvent, { foreignKey: 'triggered_by', as: 'triggeredEvents' });
ChatEvent.belongsTo(User, { foreignKey: 'triggered_by', as: 'triggerUser' });

// ChatNote associations
Chat.hasMany(ChatNote, { foreignKey: 'chat_id', as: 'notes' });
ChatNote.belongsTo(Chat, { foreignKey: 'chat_id', as: 'chat' });

User.hasMany(ChatNote, { foreignKey: 'user_id', as: 'chatNotes' });
ChatNote.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Channel associations
User.hasMany(Channel, { foreignKey: 'user_id', as: 'channels' });
Channel.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Channel.hasMany(Chat, { foreignKey: 'channel_id', as: 'chats' });
Chat.belongsTo(Channel, { foreignKey: 'channel_id', as: 'channel' });

// Chat-Widget associations
Chat.belongsTo(Widget, { foreignKey: 'widgetId', as: 'widget' });
Widget.hasMany(Chat, { foreignKey: 'widgetId', as: 'chats' });

// Chat human handoff associations
Chat.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedHuman' });
User.hasMany(Chat, { foreignKey: 'assigned_to', as: 'assignedChats' });

Widget.belongsTo(Workflow, { foreignKey: 'workflowId', as: 'workflow' });
Workflow.hasMany(Widget, { foreignKey: 'workflowId', as: 'widgets' });

// Workflow-Workspace associations
Workspace.hasMany(Workflow, { foreignKey: 'workspace_id', as: 'workflows' });
Workflow.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

module.exports = {
    sequelize,
    User,
    Chat,
    Message,
    Workflow,
    Setting,
    ApiToken,
    ActivityLog,
    UserPreference,
    WorkflowUser,
    SubscriptionPlan,
    Subscription,
    Invoice,
    BillingEvent,
    Coupon,
    BlockedIP,
    EmailTemplate,
    EmailLog,
    EmailPreference,
    Workspace,
    WorkspaceMember,
    WorkspaceInvitation,
    Widget,
    Lead,
    WidgetAssignee,
    ChatEvent,
    ChatNote,
    BillingLog,
    Channel
};
