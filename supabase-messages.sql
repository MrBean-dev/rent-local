create table messages (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references rental_requests on delete cascade not null,
  sender_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;

-- Only the renter or listing owner can read messages for a request
create policy "Participants can view messages" on messages for select using (
  auth.uid() = sender_id or
  auth.uid() = (select renter_id from rental_requests where id = request_id) or
  auth.uid() = (select owner_id from listings where id = (select listing_id from rental_requests where id = request_id))
);

-- Only participants can send messages
create policy "Participants can send messages" on messages for insert with check (
  auth.uid() = sender_id and (
    auth.uid() = (select renter_id from rental_requests where id = request_id) or
    auth.uid() = (select owner_id from listings where id = (select listing_id from rental_requests where id = request_id))
  )
);

-- Enable realtime for messages
alter publication supabase_realtime add table messages;
