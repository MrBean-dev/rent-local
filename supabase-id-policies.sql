create policy "Renters can upload their own ID"
on storage.objects for insert
with check (bucket_id = 'id-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Renters can view their own ID"
on storage.objects for select
using (bucket_id = 'id-documents' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Listing owners can view renter IDs"
on storage.objects for select
using (
  bucket_id = 'id-documents' and
  auth.uid() in (
    select l.owner_id from listings l
    inner join rental_requests r on r.listing_id = l.id
    where r.id_document_url like '%' || name || '%'
  )
);
