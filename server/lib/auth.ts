import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'assetguard-fallback-secret';

interface TokenPayload {
    id: string;
    username: string;
    fullName: string;
    role: string;
}

export function generateToken(user: TokenPayload): string {
    return jwt.sign(
        { id: user.id, username: user.username, fullName: user.fullName, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

export function verifyToken(request: NextRequest): TokenPayload | null {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
        return decoded;
    } catch {
        return null;
    }
}
