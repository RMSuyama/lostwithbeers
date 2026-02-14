-- Supabase Schema for Defense of the Bar

-- 1. Rooms Table
create table if not exists public.rooms (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    status text default 'waiting' check (status in ('waiting', 'playing', 'finished')),
    max_players integer default 10,
    created_at timestamp with time zone default now(),
    owner_id uuid -- To track who created it
);

-- 2. Players Table
create table if not exists public.players (
    id uuid default gen_random_uuid() primary key,
    room_id uuid references public.rooms(id) on delete cascade,
    user_id uuid, -- Reference to auth.users.id if using auth
    name text not null,
    champion_id text, -- name of the champion
    team_id integer check (team_id in (0, 1, 2)), -- 0: unassigned, 1: Team A, 2: Team B
    is_ready boolean default false,
    is_host boolean default false,
    joined_at timestamp with time zone default now()
);

-- 3. Lobby Chat Table
create table if not exists public.lobby_messages (
    id uuid default gen_random_uuid() primary key,
    room_id uuid references public.rooms(id) on delete cascade,
    sender_name text not null,
    content text not null,
    created_at timestamp with time zone default now()
);

-- Realtime Configuration
-- Enable Realtime for these tables
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.lobby_messages;

-- RLS (Row Level Security) - Simplified for MVP (Allow all for now, but good to have the structure)
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.lobby_messages enable row level security;

create policy "Enable all for everyone" on public.rooms for all using (true);
create policy "Enable all for everyone" on public.players for all using (true);
create policy "Enable all for everyone" on public.lobby_messages for all using (true);
