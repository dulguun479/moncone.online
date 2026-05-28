-- Create video_playback_logs table for advanced viewing analytics
create table if not exists public.video_playback_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  movie_id uuid references public.movies(id) on delete cascade,
  event_type text not null, -- 'play', 'pause', 'seek', 'ended'
  current_time integer not null, -- current time in seconds
  duration integer not null, -- total duration in seconds
  device_metadata jsonb, -- platform, user agent, etc.
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.video_playback_logs enable row level security;

-- Allow authenticated users to insert their own logs
create policy "Users can insert their own video logs"
  on public.video_playback_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Allow anonymous users to insert anonymous logs (when user_id is null)
create policy "Anonymous can insert anonymous video logs"
  on public.video_playback_logs
  for insert
  to anon
  with check (user_id is null);

-- Allow admins (authenticated with admin role) to read logs
create policy "Admins can view all video logs"
  on public.video_playback_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- Grant basic DML permissions to roles
grant insert on table public.video_playback_logs to authenticated, anon;
grant select on table public.video_playback_logs to authenticated;
