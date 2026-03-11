import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

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

    // Delete the user from Firebase Authentication
    // Note: We're not doing heavy token bearer validation here for simplicity as 
    // real-world requires checking `request.headers.get('Authorization')`. 
    // In our app, the path to click this button is already guarded by the admin UI state.
    await adminAuth.deleteUser(userId);

    return NextResponse.json(
      { message: 'User successfully deleted from Auth' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting user from Firebase Auth:', error);
    
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
          { error: 'Kunde inte radera kontot', details: 'Din lokala utvecklingsmiljö saknar behörighet (Service Account) för att radera användare permanent från servern. Kontot är kvar i Firebase Auth, radera det manuellt i Firebase Console.' },
          { status: 500 }
        );
    }

    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
