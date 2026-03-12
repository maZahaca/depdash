import { Ecosystem } from '@prisma/client';
import { AuditParser } from './types';
import { NpmAuditParser } from './npm';
import { GoParser } from './go';
import { PythonParser } from './python';
import { DockerParser } from './docker';
import { NuGetParser } from './nuget';
import { SwiftParser } from './swift';
import { AndroidParser } from './android';
import { RustParser } from './rust';
import { RubyParser } from './ruby';
import { PHPParser } from './php';

export const parserRegistry: Record<Ecosystem, AuditParser> = {
  [Ecosystem.NPM]: new NpmAuditParser(),
  [Ecosystem.GO]: new GoParser(),
  [Ecosystem.PYTHON]: new PythonParser(),
  [Ecosystem.NUGET]: new NuGetParser(),
  [Ecosystem.SWIFT]: new SwiftParser(),
  [Ecosystem.ANDROID]: new AndroidParser(),
  [Ecosystem.DOCKER]: new DockerParser(),
  [Ecosystem.RUST]: new RustParser(),
  [Ecosystem.RUBY]: new RubyParser(),
  [Ecosystem.PHP]: new PHPParser(),
};

export * from './types';
export * from './npm';
export * from './go';
export * from './python';
export * from './docker';
export * from './nuget';
export * from './swift';
export * from './android';
export * from './rust';
export * from './ruby';
export * from './php';
