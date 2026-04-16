create table reviews (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references rental_requests on delete cascade not null,
  listing_id uuid references listings on delete cascade not null,
  reviewer_id uuid references auth.users on delete cascade not null,
  reviewee_id uuid references auth.users on delete cascade not null,
  reviewer_type text not null check (reviewer_type in ('renter', 'owner')),
  rating integer not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz default now(),
  unique (request_id, reviewer_id)
);

alter table reviews enable row level security;

create policy "Anyone can view reviews" on reviews for select using (true);

create policy "Participants can leave reviews" on reviews for insert with check (
  auth.uid() = reviewer_id and (
    auth.uid() = (select renter_id from rental_requests where id = request_id) or
    auth.uid() = (select owner_id from listings where id = listing_id)
  )
);
