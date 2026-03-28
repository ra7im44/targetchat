import React from 'react';
import DocsLayout from '../../../components/docs/DocsLayout';
import Callout from '../../../components/docs/Callout';

export default function WorkspacesFeature() {
    return (
        <DocsLayout
            title="Workspaces"
            description="Organize your teams and workflows with Workspaces"
        >
            <h1 id="workspaces">Workspaces</h1>
            <p className="lead">
                Workspaces allow you to organize your chatbots, leads, and team members into separate environments. They are perfect for agencies managing multiple clients or companies with multiple departments.
            </p>

            <h2 id="switching-workspaces">Switching Workspaces</h2>
            <p>
                You can switch between workspaces using the <strong>Workspace Switcher</strong> at the top of the sidebar.
            </p>
            <ol>
                <li>Click your current workspace name (top-left of sidebar).</li>
                <li>Select a different workspace from the dropdown menu.</li>
                <li>The dashboard will instantly reload to show data for that workspace.</li>
            </ol>

            <h2 id="creating-workspace">Creating a Workspace</h2>
            <p>
                To create a new shared environment:
            </p>
            <ol>
                <li>Open the Workspace Switcher.</li>
                <li>Click <strong>"+ Create Workspace"</strong>.</li>
                <li>Enter a name (e.g., "Marketing Team" or "Client X").</li>
                <li>Click <strong>Create</strong>.</li>
            </ol>

            <h2 id="workspace-members">Managing Members</h2>
            <p>
                Invite team members to collaborate on your bots.
            </p>
            <ol>
                <li>Open the Workspace Switcher.</li>
                <li>Click <strong>"Manage Members"</strong>.</li>
                <li>Enter the email address of the user you want to invite.</li>
                <li>Select their role:
                    <ul>
                        <li><strong>Owner:</strong> Full access + billing.</li>
                        <li><strong>Admin:</strong> Can create bots and invite members.</li>
                        <li><strong>Member:</strong> Can view chats and analytics.</li>
                    </ul>
                </li>
            </ol>

            <Callout type="note">
                Workflows created inside a Workspace are visible to all members of that workspace. Workflows created outside a workspace are <strong>Personal</strong> and only visible to you.
            </Callout>

            <h2 id="personal-vs-workspace">Personal vs. Workspace</h2>
            <table>
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Personal</th>
                        <th>Workspace</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Visibility</strong></td>
                        <td>Only You</td>
                        <td>All Members</td>
                    </tr>
                    <tr>
                        <td><strong>Leads</strong></td>
                        <td>Private</td>
                        <td>Shared</td>
                    </tr>
                    <tr>
                        <td><strong>Billing</strong></td>
                        <td>Personal Card</td>
                        <td>Workspace Payment Method</td>
                    </tr>
                </tbody>
            </table>
        </DocsLayout>
    );
}
