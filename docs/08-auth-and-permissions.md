# Authentication and Permissions

## Authentication
- Supabase Auth
- email and password login
- password reset by email
- persistent sessions
- secure logout

## Signup flows

### Self-service customer signup
- creates auth user
- creates customer organization
- creates membership with admin role
- redirects to onboarding

### Admin-created customer account
- admin creates organization
- admin invites initial customer user
- invited user joins existing organization

### Customer invites colleague
- only customer admins can invite
- invite joins existing organization
- invite assigns admin, member, or viewer role

### Provider and admin creation
- internal only
- no public self-registration

## Access principles
- never trust client-only role checks
- scope data by organization membership
- customers never see other organizations
- providers only see scoped organizations or projects
- admins can access platform-level tools

## Route expectations
- /portal/* = authenticated
- customer areas = scoped to membership
- internal areas = provider and admin only
- admin areas = admin only
