import { NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebase-admin';
export const runtime = 'edge';
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!adminAuth) {
      // If adminAuth failed to initialize (e.g. missing credentials locally),
      // we gracefully return an error so the frontend knows what happened.
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Missing credentials?' },
        { status: 500 }
      );
    }

    // Instead of deleting, we randomize the password to lock out the old user
    // This allows us to keep the Firebase Auth account and "Recycle" the employee ID/email
    const randomPassword = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
      
    await adminAuth.updateUser(userId, { password: randomPassword });
    await adminAuth.revokeRefreshTokens(userId); // Ensure any active sessions are killed

    return NextResponse.json(
      { message: 'User locked out and password randomized safely' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error locking out user from Firebase Auth:', error);
    
    // Depending on the exact error (like user-not-found), we might not want to 500
    if (error.code === 'auth/user-not-found') {
        return NextResponse.json(
          { message: 'User was not found in Auth (already deleted or never created)' },
          { status: 200 } // We can consider this a success since the end-goal is reached
        );
    }
    
    // Check if the service account credentials are missing (local dev issue)
    if (error.code === 'app/invalid-credential' || 
        (error.message && error.message.includes('Project Id')) || 
        (error.message && error.message.includes('default credentials'))) {
        return NextResponse.json(
          { error: 'Kunde inte låsa kontot', details: 'Din lokala utvecklingsmiljö saknar behörighet. Kontot uppdaterades i Firestore men Firebase Auth ignoreras.' },
          { status: 500 }
        );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const resolvedParams = await params;
      const userId = resolvedParams.id;
      const { password } = await request.json();
  
      if (!userId || !password) {
        return NextResponse.json({ error: 'User ID and password are required' }, { status: 400 });
      }
  
      if (!adminAuth || !adminFirestore) {
        return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
      }
  
      try {
        await adminAuth.updateUser(userId, { password });
        await adminAuth.revokeRefreshTokens(userId);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          // Användaren finns inte i Auth. Återskapa kontot med data från Firestore
          const userDoc = await adminFirestore.collection('profiles').doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData && userData.employeeId) {
              const authEmail = `${userData.employeeId}@timelog.app`;
              await adminAuth.createUser({
                uid: userId,
                email: authEmail,
                password: password,
              });
            } else {
              throw new Error('Användaren saknar anställningsnummer i databasen.');
            }
          } else {
            throw new Error('Användaren finns inte i databasen.');
          }
        } else if (
          authError.code === 'app/invalid-credential' ||
          (authError.message && authError.message.includes('Project Id')) ||
          (authError.message && authError.message.includes('default credentials'))
        ) {
          return NextResponse.json(
            {
              error: 'Kunde inte uppdatera lösenordet',
              details: 'Din lokala miljö saknar utvecklingsbehörigheter.',
            },
            { status: 500 }
          );
        } else {
          throw authError; // Kasta vidare andra obekanta fel
        }
      }
  
      return NextResponse.json({ message: 'User password updated successfully' }, { status: 200 });
    } catch (error: any) {
      console.error('Error updating user password:', error);
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }
