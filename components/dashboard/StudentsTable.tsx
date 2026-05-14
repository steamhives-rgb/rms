// StudentsTable dashboard component
'use client';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import type { Student } from '@/lib/types';

interface StudentsTableProps {
  students: Student[];
  onEdit?: (s: Student) => void;
  onDelete?: (s: Student) => void;
}

export default function StudentsTable({ students, onEdit, onDelete }: StudentsTableProps) {
  if (!students.length) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-600">
        <p className="text-4xl mb-3">👨‍🎓</p>
        <p className="font-medium">No students found</p>
        <p className="text-sm mt-1">Add students or adjust your filters</p>
      </div>
    );
  }

  return (
    <Table>
      <Thead>
        <tr>
          <Th>Student</Th>
          <Th>Adm No.</Th>
          <Th>Class</Th>
          <Th>Gender</Th>
          {(onEdit || onDelete) && <Th className="text-right">Actions</Th>}
        </tr>
      </Thead>
      <Tbody>
        {students.map(s => (
          <Tr key={s.id}>
            <Td>
              <div className="flex items-center gap-2">
                <Avatar src={s.passport} name={s.name} size="sm" />
                <span className="font-medium text-gray-900 dark:text-gray-100">{s.name}</span>
              </div>
            </Td>
            <Td><span className="font-mono text-xs">{s.adm}</span></Td>
            <Td>{s.class}</Td>
            <Td>
              {s.gender && (
                <Badge variant={s.gender === 'Male' ? 'info' : 'orange'}>{s.gender}</Badge>
              )}
            </Td>
            {(onEdit || onDelete) && (
              <Td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {onEdit && (
                    <button onClick={() => onEdit(s)} className="text-xs text-orange-500 hover:text-orange-700 font-medium">Edit</button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(s)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                  )}
                </div>
              </Td>
            )}
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}